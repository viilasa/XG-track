// Vercel Serverless Function to proxy Official Twitter API v2 requests
// This avoids CORS issues in production

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get the path after /api/x
    const { path, ...queryParams } = req.query;
    
    if (!path) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }

    // Build the api.x.com URL
    const apiPath = Array.isArray(path) ? path.join('/') : path;
    const url = new URL(`https://api.x.com/${apiPath}`);
    
    // Add query params
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });

    // Get Bearer token from environment
    const bearerToken = process.env.X_BEARER_TOKEN;
    if (!bearerToken) {
      return res.status(500).json({ error: 'X_BEARER_TOKEN not configured' });
    }

    // Make the request to api.x.com
    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    // Return the response
    res.status(response.status).json(data);
  } catch (error) {
    console.error('X API proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed', message: error.message });
  }
}
