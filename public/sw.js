self.addEventListener('push', (event) => {
  let data = { title: 'Shorts 알림', body: '오늘 진행 상태를 체크해 주세요.', url: '/' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || '새로운 알림이 도착했어요.',
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(data.title || '알림', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
