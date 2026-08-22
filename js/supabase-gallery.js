import { APP_CONFIG, isSupabaseConfigured } from './config.js';

let client = null;

export async function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;

  const supabaseModule = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
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
  const supabase = await getSupabaseClient();
  if (!supabase) return { configured: false, session: null };
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return { configured: true, session: data.session };
}

export async function login(email, password) {
  const supabase = await getSupabaseClient();
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function logout() {
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function listPhotos() {
  const supabase = await getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(APP_CONFIG.supabase.table)
    .select('id,title,caption,public_url,storage_path,created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

function safeExtension(file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
}

function makeStoragePath(file) {
  const extension = safeExtension(file);
  const random = crypto.getRandomValues(new Uint32Array(2)).join('-');
  return `memories/${Date.now()}-${random}.${extension}`;
}

async function currentUser(supabase) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const user = data.session?.user;
  if (!user) throw new Error('Debes iniciar sesión para administrar el álbum.');
  return user;
}

async function uploadFile(supabase, file) {
  const path = makeStoragePath(file);
  const { error } = await supabase.storage
    .from(APP_CONFIG.supabase.bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });
  if (error) throw error;

  const { data } = supabase.storage.from(APP_CONFIG.supabase.bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function uploadPhoto({ file, title, caption }) {
  const supabase = await getSupabaseClient();
  if (!supabase) throw new Error('Supabase no está configurado.');
  const user = await currentUser(supabase);
  const uploaded = await uploadFile(supabase, file);

  const { data: photoRow, error: insertError } = await supabase
    .from(APP_CONFIG.supabase.table)
    .insert({
      title: title.trim(),
      caption: caption.trim(),
      storage_path: uploaded.path,
      public_url: uploaded.publicUrl,
      uploaded_by: user.id
    })
    .select('id,title,caption,public_url,storage_path,created_at')
    .single();

  if (insertError) {
    await supabase.storage.from(APP_CONFIG.supabase.bucket).remove([uploaded.path]).catch(() => {});
    throw insertError;
  }

  return photoRow;
}

export async function updatePhoto({ id, oldStoragePath, title, caption, replacementFile = null }) {
  const supabase = await getSupabaseClient();
  if (!supabase) throw new Error('Supabase no está configurado.');
  await currentUser(supabase);

  let newUpload = null;
  if (replacementFile) newUpload = await uploadFile(supabase, replacementFile);

  const patch = {
    title: title.trim(),
    caption: caption.trim(),
    updated_at: new Date().toISOString()
  };
  if (newUpload) {
    patch.storage_path = newUpload.path;
    patch.public_url = newUpload.publicUrl;
  }

  const { data, error } = await supabase
    .from(APP_CONFIG.supabase.table)
    .update(patch)
    .eq('id', id)
    .select('id,title,caption,public_url,storage_path,created_at')
    .single();

  if (error) {
    if (newUpload) await supabase.storage.from(APP_CONFIG.supabase.bucket).remove([newUpload.path]).catch(() => {});
    throw error;
  }

  if (newUpload && oldStoragePath && oldStoragePath !== newUpload.path) {
    await supabase.storage.from(APP_CONFIG.supabase.bucket).remove([oldStoragePath]).catch(() => {});
  }
  return data;
}

export async function deletePhoto({ id, storagePath }) {
  const supabase = await getSupabaseClient();
  if (!supabase) throw new Error('Supabase no está configurado.');
  await currentUser(supabase);

  const { error } = await supabase.from(APP_CONFIG.supabase.table).delete().eq('id', id);
  if (error) throw error;
  if (storagePath) await supabase.storage.from(APP_CONFIG.supabase.bucket).remove([storagePath]).catch(() => {});
}
