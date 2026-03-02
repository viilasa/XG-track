// Vercel Serverless Function to proxy twitterapi.io requests

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { path, ...queryParams } = req.query;
    
    if (!path) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }

    const apiPath = Array.isArray(path) ? path.join('/') : path;
    const url = new URL(`https://api.twitterapi.io/${apiPath}`);
    
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, String(value));
    });

    const apiKey = process.env.TWITTERAPI_IO_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'TWITTERAPI_IO_KEY not configured' });
    }

    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy request failed', message: error.message });
  }
}
