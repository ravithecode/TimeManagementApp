const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { table, method, body, filters } = JSON.parse(event.body || '{}');
    
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    
    // Build query string from filters
    if (filters && Object.keys(filters).length > 0) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => {
        params.append(key, `eq.${val}`);
      });
      url += '?' + params.toString();
    }

    // For select, add select=* if no filters handle it
    if (method === 'GET' && (!filters || !filters.select)) {
      url += (url.includes('?') ? '&' : '?') + 'select=*';
    }

    const sbHeaders = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': method === 'POST' ? 'return=representation' : 
                method === 'PATCH' ? 'return=representation' : ''
    };

    const response = await fetch(url, {
      method: method || 'GET',
      headers: sbHeaders,
      body: ['POST', 'PATCH', 'PUT'].includes(method) ? JSON.stringify(body) : undefined
    });

    const text = await response.text();
    let data = null;
    try { data = JSON.parse(text); } catch(e) { data = text; }

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify({ data, status: response.status })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
