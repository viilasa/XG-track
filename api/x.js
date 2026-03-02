// Vercel Serverless Function to proxy Official Twitter API v2 requests

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { path, ...queryParams } = req.query;
    
    if (!path) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }

    const apiPath = Array.isArray(path) ? path.join('/') : path;
    const url = new URL(`https://api.x.com/${apiPath}`);
    
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, String(value));
    });

    let bearerToken = process.env.X_BEARER_TOKEN;
    if (!bearerToken) {
      return res.status(500).json({ error: 'X_BEARER_TOKEN not configured' });
    }
    
    if (bearerToken.includes('%')) {
      try {
        bearerToken = decodeURIComponent(bearerToken);
      } catch {
        // Use as-is
      }
    }

    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy request failed', message: error.message });
  }
}
