const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;

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

    // AI proxy — keeps the Anthropic key server-side
    if (table === '__ai') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      return { statusCode: res.status, headers, body: JSON.stringify({ data }) };
    }

    let url = `${SUPABASE_URL}/rest/v1/${table}`;

    if (filters && Object.keys(filters).length > 0) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => {
        params.append(key, `eq.${val}`);
      });
      url += '?' + params.toString();
    }

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
