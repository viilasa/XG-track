export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL

  if (!supabaseUrl) {
    return res.status(500).json({ error: 'SUPABASE_URL not configured' })
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS')
    return res.status(204).end()
  }

  // Build the target URL: forward everything after /api/supabase/
  const { path: rawPath, ...queryParams } = req.query
  const path = Array.isArray(rawPath) ? rawPath.join('/') : rawPath || ''
  const qs = new URLSearchParams(queryParams).toString()
  const targetUrl = `${supabaseUrl}/${path}${qs ? `?${qs}` : ''}`

  // Forward relevant headers — skip hop-by-hop headers
  const skipReqHeaders = new Set([
    'host', 'connection', 'content-length', 'transfer-encoding',
  ])
  const headers = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (skipReqHeaders.has(key)) continue
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

    // Only forward safe response headers — skip anything that causes size mismatches
    const safeResHeaders = [
      'content-type', 'content-range', 'x-total-count',
      'preference-applied', 'location', 'x-request-id',
    ]
    for (const h of safeResHeaders) {
      const v = response.headers.get(h)
      if (v) res.setHeader(h, v)
    }

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Expose-Headers', 'content-range, x-total-count')

    const data = await response.text()
    res.status(response.status).send(data)
  } catch (err) {
    console.error('[Supabase Proxy] Error:', err.message)
    res.status(502).json({ error: 'Proxy failed', message: err.message })
  }
}
