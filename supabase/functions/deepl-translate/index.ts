import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-deepl-auth-key',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const authHeader = req.headers.get('Authorization')

  if (supabaseUrl && supabaseAnonKey && authHeader?.startsWith('Bearer ')) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  const deeplKey = req.headers.get('X-DeepL-Auth-Key')?.trim()
  if (!deeplKey) {
    return new Response(JSON.stringify({ error: 'Missing X-DeepL-Auth-Key header' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const body = await req.text()
  const isFree = deeplKey.endsWith(':fx')
  const target = isFree ? 'https://api-free.deepl.com' : 'https://api.deepl.com'

  const deeplRes = await fetch(`${target}/v2/translate`, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${deeplKey}`,
      'Content-Type': 'application/json',
    },
    body,
  })

  const responseBody = await deeplRes.text()
  return new Response(responseBody, {
    status: deeplRes.status,
    headers: {
      ...corsHeaders,
      'Content-Type': deeplRes.headers.get('Content-Type') ?? 'application/json',
    },
  })
})
