export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL

  if (!supabaseUrl) {
    return res.status(500).json({ error: 'SUPABASE_URL not configured' })
  }

  // Build the target URL: forward everything after /api/supabase/
  const { path: rawPath, ...queryParams } = req.query
  const path = Array.isArray(rawPath) ? rawPath.join('/') : rawPath || ''
  const qs = new URLSearchParams(queryParams).toString()
  const targetUrl = `${supabaseUrl}/${path}${qs ? `?${qs}` : ''}`

  // Forward all headers except host
  const headers = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (key === 'host' || key === 'connection') continue
    headers[key] = value
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    })

    // Forward response headers
    for (const [key, value] of response.headers.entries()) {
      if (key === 'transfer-encoding') continue
      res.setHeader(key, value)
    }

    // Allow CORS from our own origin
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    res.setHeader('Access-Control-Expose-Headers', '*')

    if (req.method === 'OPTIONS') {
      return res.status(204).end()
    }

    const data = await response.text()
    res.status(response.status).send(data)
  } catch (err) {
    console.error('[Supabase Proxy] Error:', err.message)
    res.status(502).json({ error: 'Proxy failed', message: err.message })
  }
}
