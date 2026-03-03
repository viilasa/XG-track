export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL

  if (!supabaseUrl) {
    return res.status(500).json({ error: 'SUPABASE_URL not configured' })
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    return res.status(204).end()
  }

  // Build the target URL: forward everything after /api/supabase/
  const { path: rawPath, ...queryParams } = req.query
  const path = Array.isArray(rawPath) ? rawPath.join('/') : rawPath || ''
  const qs = new URLSearchParams(queryParams).toString()
  const targetUrl = `${supabaseUrl}/${path}${qs ? `?${qs}` : ''}`

  // Forward relevant headers — skip hop-by-hop and size headers
  const skipHeaders = new Set(['host', 'connection', 'content-length', 'transfer-encoding'])
  const headers = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (skipHeaders.has(key)) continue
    headers[key] = value
  }

  // Build body for non-GET/HEAD requests
  let body = undefined
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body != null) {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    })

    // Forward response headers
    const skipResHeaders = new Set(['transfer-encoding', 'connection', 'content-encoding'])
    for (const [key, value] of response.headers.entries()) {
      if (skipResHeaders.has(key)) continue
      res.setHeader(key, value)
    }

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Expose-Headers', '*')

    const data = await response.arrayBuffer()
    res.status(response.status).send(Buffer.from(data))
  } catch (err) {
    console.error('[Supabase Proxy] Error:', err.message)
    res.status(502).json({ error: 'Proxy failed', message: err.message })
  }
}
