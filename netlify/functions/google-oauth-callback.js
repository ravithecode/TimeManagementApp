const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI;
const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_KEY;
const APP_URL       = process.env.APP_URL || 'http://localhost:8888';

async function sbReq(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: (method === 'POST' || method === 'PATCH') ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

exports.handler = async (event) => {
  const { code, state: user_id, error } = event.queryStringParameters || {};

  if (error || !code) {
    return { statusCode: 302, headers: { Location: `${APP_URL}/?calendar=error&reason=${error||'no_code'}` } };
  }

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    'authorization_code'
      })
    });
    const tokens = await tokenRes.json();

    if (tokens.error) {
      return { statusCode: 302, headers: { Location: `${APP_URL}/?calendar=error&reason=${tokens.error}` } };
    }
    if (!tokens.refresh_token) {
      // prompt:consent should always return this — if missing, force re-auth
      return { statusCode: 302, headers: { Location: `${APP_URL}/?calendar=error&reason=no_refresh_token` } };
    }

    // Upsert refresh token in calendar_tokens table
    const existing = await sbReq(`calendar_tokens?user_id=eq.${user_id}&provider=eq.google`);
    if (Array.isArray(existing) && existing.length) {
      await sbReq(`calendar_tokens?id=eq.${existing[0].id}`, 'PATCH', {
        refresh_token: tokens.refresh_token,
        updated_at: new Date().toISOString()
      });
    } else {
      await sbReq('calendar_tokens', 'POST', {
        user_id,
        provider: 'google',
        refresh_token: tokens.refresh_token
      });
    }

    return { statusCode: 302, headers: { Location: `${APP_URL}/?calendar=connected` } };
  } catch (err) {
    return { statusCode: 302, headers: { Location: `${APP_URL}/?calendar=error&reason=${encodeURIComponent(err.message)}` } };
  }
};
