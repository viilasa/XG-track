// Vercel Serverless Function to proxy twitterapi.io requests
// This avoids CORS issues in production

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get the path after /api/twitter
    const { path, ...queryParams } = req.query;
    
    if (!path) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }

    // Build the twitterapi.io URL
    const apiPath = Array.isArray(path) ? path.join('/') : path;
    const url = new URL(`https://api.twitterapi.io/${apiPath}`);
    
    // Add query params
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });

    // Get API key from environment
    const apiKey = process.env.TWITTERAPI_IO_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'TWITTERAPI_IO_KEY not configured' });
    }

    // Make the request to twitterapi.io
    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    // Return the response
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Twitter API proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed', message: error.message });
  }
}
