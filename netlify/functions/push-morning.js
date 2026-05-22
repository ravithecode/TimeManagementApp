const { getSubscriptions, getOverdueCount, sendPush } = require('./_push-helper');

exports.handler = async () => {
  try {
    const subs = await getSubscriptions('notif_morning');
    if (!subs.length) return { statusCode: 200, body: 'no subscribers' };

    await Promise.allSettled(subs.map(async sub => {
      let body = 'time to set your intentions for the day ☀️';
      if (sub.notif_overdue) {
        const overdue = await getOverdueCount(sub.user_id);
        if (overdue > 0) body += ` · ${overdue} overdue task${overdue > 1 ? 's' : ''}`;
      }
      return sendPush(sub, {
        title: 'good morning ☀️',
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: 'morning-checkin',
        data: { url: '/' }
      });
    }));

    return { statusCode: 200, body: `sent to ${subs.length}` };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};
