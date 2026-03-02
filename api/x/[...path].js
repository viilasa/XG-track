// Vercel Serverless Function to proxy Official Twitter API v2 requests
// Catch-all route: /api/x/* -> https://api.x.com/*

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
    // Get the path segments from the catch-all route
    const pathSegments = req.query.path;
    
    if (!pathSegments || pathSegments.length === 0) {
      return res.status(400).json({ error: 'Missing path' });
    }

    // Build the api.x.com URL
    const apiPath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;
    const url = new URL(`https://api.x.com/${apiPath}`);
    
    // Add query params (excluding 'path' which is the route param)
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'path' && value) {
        url.searchParams.set(key, String(value));
      }
    });

    // Get Bearer token from environment
    const bearerToken = process.env.X_BEARER_TOKEN;
    if (!bearerToken) {
      console.error('X_BEARER_TOKEN not found in environment');
      return res.status(500).json({ error: 'X_BEARER_TOKEN not configured' });
    }

    console.log(`[X API Proxy] ${req.method} ${url.toString()}`);

    // Make the request to api.x.com
    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    console.log(`[X API Proxy] Response status: ${response.status}`);
    
    // Return the response
    res.status(response.status).json(data);
  } catch (error) {
    console.error('X API proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed', message: error.message });
  }
}
