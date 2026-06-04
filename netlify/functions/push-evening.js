const { getSubscriptions, sendPush } = require('./_push-helper');

exports.handler = async () => {
  try {
    const subs = await getSubscriptions('notif_evening');
    if (!subs.length) return { statusCode: 200, body: 'no subscribers' };

    await Promise.allSettled(subs.map(sub =>
      sendPush(sub, {
        title: 'wind down 🌙',
        body: 'time to reflect on your day and journal',
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: 'evening-reflection',
        data: { url: '/' }
      })
    ));

    return { statusCode: 200, body: `sent to ${subs.length}` };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};
