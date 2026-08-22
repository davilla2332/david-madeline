import { APP_CONFIG, isSupabaseConfigured } from './config.js';
import { getSupabaseClient } from './supabase-gallery.js';

async function requireUser() {
  const supabase = await getSupabaseClient();
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const user = data.session?.user;
  if (!user) throw new Error('Debes iniciar sesión para administrar capítulos.');
  return { supabase, user };
}

export async function listChapters() {
  if (!isSupabaseConfigured()) return [];
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from(APP_CONFIG.supabase.chaptersTable || 'story_chapters')
    .select('id,title,story_date,body,emoji,created_at,updated_at')
    .order('story_date', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createChapter({ title, storyDate, body, emoji }) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from(APP_CONFIG.supabase.chaptersTable || 'story_chapters')
    .insert({
      title: title.trim(),
      story_date: storyDate,
      body: body.trim(),
      emoji: emoji.trim() || '❤',
      created_by: user.id
    })
    .select('id,title,story_date,body,emoji,created_at,updated_at')
    .single();
  if (error) throw error;
  return data;
}

export async function updateChapter({ id, title, storyDate, body, emoji }) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from(APP_CONFIG.supabase.chaptersTable || 'story_chapters')
    .update({
      title: title.trim(),
      story_date: storyDate,
      body: body.trim(),
      emoji: emoji.trim() || '❤',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('id,title,story_date,body,emoji,created_at,updated_at')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteChapter(id) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from(APP_CONFIG.supabase.chaptersTable || 'story_chapters').delete().eq('id', id);
  if (error) throw error;
}
