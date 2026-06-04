const { getSubscriptions, sendPush } = require('./_push-helper');

exports.handler = async () => {
  try {
    const subs = await getSubscriptions('notif_habits');
    if (!subs.length) return { statusCode: 200, body: 'no subscribers' };

    await Promise.allSettled(subs.map(sub =>
      sendPush(sub, {
        title: 'habit check 🌿',
        body: "don't forget your habits today",
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: 'habit-reminder',
        data: { url: '/' }
      })
    ));

    return { statusCode: 200, body: `sent to ${subs.length}` };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};
