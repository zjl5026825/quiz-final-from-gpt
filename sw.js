/* =========================
   Quiz PWA Service Worker
   - HTML / navigation: Network First（保证更新）
   - Static assets: Cache First（保证离线与速度）
   - Version bump triggers refresh（iOS 必须）
   ========================= */

const VERSION = 'v3';  // <- 发布新版本改这里：v4 / v5 ...
const CACHE_NAME = `quiz-pwa-${VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './vendor/mammoth.browser.min.js'
];

// 安装：缓存核心文件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// 激活：清理旧版本缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

/**
 * HTML/导航：Network First（拿不到网络时回退缓存 index.html）
 */
async function networkFirst(req) {
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await caches.match(req);
    return cached || caches.match('./index.html');
  }
}

/**
 * 静态资源：Cache First（提升速度，离线可用）
 */
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  try {
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    // 如果是图片/脚本等失败，尽量返回空响应
    return cached || new Response('', { status: 504 });
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 只处理同源请求（GitHub Pages）
  if (url.origin !== location.origin) return;

  // 导航请求（地址栏、刷新、SPA）
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
    return;
  }

  // 静态文件（js/css/png/json 等）：Cache First
  event.respondWith(cacheFirst(req));
});
