import { APP_CONFIG, isSupabaseConfigured } from './config.js';

let client = null;
let supabaseModule = null;

async function getClient() {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;

  supabaseModule = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  client = supabaseModule.createClient(APP_CONFIG.supabase.url, APP_CONFIG.supabase.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  return client;
}

export async function getCloudState() {
  const supabase = await getClient();
  if (!supabase) return { configured: false, session: null };
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return { configured: true, session: data.session };
}

export async function login(email, password) {
  const supabase = await getClient();
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function logout() {
  const supabase = await getClient();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function listPhotos() {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(APP_CONFIG.supabase.table)
    .select('id,title,caption,public_url,created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

function safeExtension(file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
}

export async function uploadPhoto({ file, title, caption }) {
  const supabase = await getClient();
  if (!supabase) throw new Error('Supabase no está configurado.');

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user) throw new Error('Debes iniciar sesión para subir fotos.');

  const extension = safeExtension(file);
  const random = crypto.getRandomValues(new Uint32Array(2)).join('-');
  const path = `memories/${Date.now()}-${random}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(APP_CONFIG.supabase.bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from(APP_CONFIG.supabase.bucket)
    .getPublicUrl(path);

  const { data: photoRow, error: insertError } = await supabase
    .from(APP_CONFIG.supabase.table)
    .insert({
      title: title.trim(),
      caption: caption.trim(),
      storage_path: path,
      public_url: urlData.publicUrl,
      uploaded_by: user.id
    })
    .select('id,title,caption,public_url,created_at')
    .single();

  if (insertError) {
    await supabase.storage.from(APP_CONFIG.supabase.bucket).remove([path]).catch(() => {});
    throw insertError;
  }

  return photoRow;
}
