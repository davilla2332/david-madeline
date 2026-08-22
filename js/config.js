export const APP_CONFIG = {
  couple: {
    personA: 'David',
    personB: 'Madeline',
    startedTalking: '2026-07-12T00:00:00-05:00',
    firstMeeting: '2026-08-16T00:00:00-05:00'
  },

  // Conexión opcional a Supabase.
  // IMPORTANTE: usa únicamente la ANON/PUBLISHABLE KEY del proyecto, nunca la service_role key.
  supabase: {
    url: 'https://onhcxswrmvrzkcpqqxpf.supabase.co',
    anonKey: 'sb_publishable_sz2kZHK2RXxNkf0ePfXMFQ_Un9O5jqy',
    bucket: 'couple-photos',
    table: 'couple_photos',
    aiFunction: 'romantic-ai'
  },

  upload: {
    maxFileSizeMB: 8,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  }
};

export function isSupabaseConfigured() {
  const { url, anonKey } = APP_CONFIG.supabase;
  return Boolean(
    url &&
    anonKey &&
    !url.includes('PEGA_AQUI') &&
    !anonKey.includes('PEGA_AQUI') &&
    /^https:\/\/.+\.supabase\.co\/?$/i.test(url)
  );
}
