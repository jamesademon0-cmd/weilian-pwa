// 微练 PWA Service Worker
// 缓存策略：先缓存，后更新（stale-while-revalidate）

const CACHE_NAME = 'weilian-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

// 安装：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.log('SW install error:', err))
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截：stale-while-revalidate 策略
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // 有缓存就先返回，同时后台更新
      const fetchPromise = fetch(event.request).then((response) => {
        // 成功获取后更新缓存
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // 离线且无缓存时返回主页
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
      // 优先返回缓存，否则发起网络请求
      return cached || fetchPromise;
    })
  );
});

// 消息通信：接收更新指令
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
