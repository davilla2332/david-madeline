const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const allowedTypes = new Set([
  'reason',
  'jar',
  'open_when',
  'letter',
  'chapter'
]);

function promptFor(type: string, context: string, maxLength: number) {
  const coupleContext = `La página romántica es de David para Madeline. Empezaron a hablar el 12 de julio de 2026 y se conocieron en persona el 16 de agosto de 2026. El tono debe ser romántico, cálido, natural, íntimo y humano, sin sonar exagerado ni genérico.`;
  const limits = `Máximo aproximado: ${maxLength} caracteres. No uses markdown, encabezados, comillas envolventes ni emojis en exceso.`;

  const instructions: Record<string, string> = {
    reason: 'Escribe una sola razón nueva y distinta por la que David se alegra de haber conocido a Madeline.',
    jar: 'Escribe un mensaje corto para un frasquito de recuerdos: algo que Madeline pueda leer al azar y que le saque una sonrisa o la haga sentirse querida.',
    open_when: `Escribe un mensaje de “Abrir cuando…” para esta situación: ${context || 'necesite sentir cariño'}. Debe ser reconfortante y personal.`,
    letter: 'Escribe una carta romántica breve para Madeline, desde David, centrada en seguir construyendo su historia juntos. Incluye las fechas solo si encajan naturalmente.',
    chapter: `Ayuda a convertir estas notas en un capítulo romántico y natural de su historia: ${context || 'un nuevo recuerdo juntos'}. Devuelve solo el cuerpo del capítulo.`
  };

  return `${coupleContext}\n${instructions[type]}\n${limits}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return Response.json({ error: 'Método no permitido' }, { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Debes iniciar sesión para usar la IA.' }, { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const publishableKeys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}');
    const publishableKey = publishableKeys.default || Deno.env.get('SUPABASE_ANON_KEY');

    const verify = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: publishableKey || ''
      }
    });
    if (!verify.ok) {
      return Response.json({ error: 'Sesión no válida.' }, { status: 401, headers: corsHeaders });
    }

    const { type, context = '', maxLength = 500 } = await req.json();
    if (!allowedTypes.has(type)) {
      return Response.json({ error: 'Tipo de mensaje no válido.' }, { status: 400, headers: corsHeaders });
    }

    const safeLength = Math.max(120, Math.min(Number(maxLength) || 500, 1800));
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Falta configurar OPENAI_API_KEY en los secretos de Supabase.' }, { status: 503, headers: corsHeaders });
    }

    const model = Deno.env.get('OPENAI_MODEL') || 'gpt-5-mini';
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input: promptFor(type, String(context).slice(0, 1200), safeLength),
        max_output_tokens: type === 'letter' || type === 'chapter' ? 500 : 180
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      console.error('OpenAI error', payload);
      return Response.json({ error: 'No se pudo generar el mensaje con IA.' }, { status: 502, headers: corsHeaders });
    }

    const text = payload.output_text || payload.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === 'output_text')?.text;
    if (!text) return Response.json({ error: 'La IA no devolvió texto.' }, { status: 502, headers: corsHeaders });

    return Response.json({ text }, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Error inesperado.';
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
