import { APP_CONFIG, isSupabaseConfigured } from './config.js';
import { getSupabaseClient } from './supabase-gallery.js';

export async function generateRomanticMessage({ type, context = '', maxLength = 500 }) {
  if (!isSupabaseConfigured()) throw new Error('Supabase no está configurado.');
  const supabase = await getSupabaseClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new Error('Inicia sesión para usar la IA.');

  const { data, error } = await supabase.functions.invoke(APP_CONFIG.supabase.aiFunction || 'romantic-ai', {
    body: { type, context, maxLength }
  });
  if (error) throw error;
  if (!data?.text) throw new Error('La IA no devolvió un mensaje.');
  return data.text.trim();
}
