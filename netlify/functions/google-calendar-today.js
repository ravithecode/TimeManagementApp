const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_KEY;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}

async function getAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type:    'refresh_token'
    })
  });
  return res.json();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { user_id, date, timezone } = JSON.parse(event.body || '{}');
    if (!user_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing user_id' }) };

    // Look up stored refresh token
    const rows = await sbGet(`calendar_tokens?user_id=eq.${user_id}&provider=eq.google&select=refresh_token`);
    if (!Array.isArray(rows) || !rows.length) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'not_connected' }) };
    }

    // Get fresh access token
    const { access_token, error: tokenErr } = await getAccessToken(rows[0].refresh_token);
    if (tokenErr || !access_token) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'token_refresh_failed', detail: tokenErr }) };
    }

    // Build time range for the requested date in the user's timezone
    const tz = timezone || 'UTC';
    const targetDate = date || new Date().toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
    const timeMin = new Date(`${targetDate}T00:00:00`).toISOString();
    const timeMax = new Date(`${targetDate}T23:59:59`).toISOString();

    const params = new URLSearchParams({
      timeMin, timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      timeZone: tz
    });

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const calData = await calRes.json();

    if (calData.error) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: calData.error.message }) };
    }

    // Format to match the app's meeting structure {title, time}
    const events = (calData.items || [])
      .filter(e => e.status !== 'cancelled' && e.start?.dateTime) // skip all-day events
      .map(e => ({
        title: e.summary || 'busy',
        time: new Date(e.start.dateTime).toLocaleTimeString('en-GB', {
          hour: '2-digit', minute: '2-digit', timeZone: tz
        }), // HH:MM 24h
        end_time: new Date(e.end.dateTime).toLocaleTimeString('en-GB', {
          hour: '2-digit', minute: '2-digit', timeZone: tz
        }),
        source: 'google'
      }));

    return { statusCode: 200, headers, body: JSON.stringify({ events }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
