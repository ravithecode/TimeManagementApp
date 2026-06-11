const CLIENT_ID    = process.env.GOOGLE_CLIENT_ID;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

exports.handler = async (event) => {
  const { user_id } = event.queryStringParameters || {};
  if (!user_id) return { statusCode: 400, body: 'missing user_id' };
  if (!CLIENT_ID)  return { statusCode: 500, body: 'GOOGLE_CLIENT_ID not configured' };

  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/calendar.readonly',
    access_type:   'offline',
    prompt:        'consent', // always return refresh_token
    state:         user_id
  });

  return {
    statusCode: 302,
    headers: { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }
  };
};
