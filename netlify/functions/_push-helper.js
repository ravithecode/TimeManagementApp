const webpush = require('web-push');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL   = process.env.VAPID_EMAIL || 'mailto:admin@mytasks.app';

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return []; }
}

async function getSubscriptions(prefKey) {
  return sbGet(`push_subscriptions?${prefKey}=eq.true&select=*`) || [];
}

async function getOverdueCount(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await sbGet(`todos?user_id=eq.${userId}&done=eq.false&due=lt.${today}&select=id`);
  return Array.isArray(rows) ? rows.length : 0;
}

async function sendPush(sub, payload) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
      JSON.stringify(payload)
    );
    return true;
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired — remove it
      await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${sub.id}`, {
        method: 'DELETE',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
    }
    return false;
  }
}

module.exports = { getSubscriptions, getOverdueCount, sendPush };
