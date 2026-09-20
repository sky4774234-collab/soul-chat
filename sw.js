// 贝语 · Service Worker
// 只缓存静态壳。真实数据在 localStorage 和 Supabase，不在这里。
// v7：手机端顶部常显「设置/导出」按钮（原来文字被隐藏又无图标，看起来像没有设置入口）
// v6：新增「从链接导入配置」（iOS 主屏 App 与 Safari 存储独立，必须 App 内导入）
// v5：修同步新旧判定 / 拆 push·pull 锁
// v3：应用更名（贝语）+ 导航改「网络优先」
// v2：导航由缓存优先改网络优先（否则老用户永远看到旧版）
const CACHE = 'beiyu-v7';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // 跨域（LLM API / Supabase）一概不插手
  if (url.origin !== self.location.origin) return;

  // 页面导航 + manifest：网络优先 → 保证拿到最新版；断网时回退缓存
  // （manifest 决定主屏图标名，缓存优先会让改名延迟生效）
  const netFirst = e.request.mode === 'navigate' || /manifest\.json$/.test(url.pathname);
  if (netFirst) {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        const key = e.request.mode === 'navigate' ? './index.html' : e.request;
        caches.open(CACHE).then(c => c.put(key, copy)).catch(() => {});
        return r;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // 其余静态资源：缓存优先
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return r;
    }).catch(() => caches.match('./index.html')))
  );
});
