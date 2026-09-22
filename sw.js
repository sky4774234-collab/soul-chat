// 贝语 · Service Worker
// 只缓存静态壳。真实数据在 localStorage 和 Supabase，不在这里。
// v24：设置里新增模型预设下拉 + 思考模式开关（DeepSeek V4 实测：关思考 0.8s / 开思考 1.3-4.6s），并写入实测数据提示\n// v23：修复 init 漏调 startSync（v11 误删）——这是「手机说了话电脑收不到」的真凶；推送被 pulledOnce 挡住时主动拉一次\n// v22：pushCloud 加 25s 超时（pushing 锁不再永久锁死=修「手机只读不写」）+ 推送不静默丢弃（补推）+ 云端落后时自动把本机推上去（自愈）\n// v21：连接测试新增「写入测试」(POST 临时行+清理)；新增「推送本机到云端」按钮\n// v20：云端改写了已有消息时整体重画（治「另一端永远停在思考中」）；推送不带空占位；占位按 id 定位\n// v19：聊天请求加 180s 超时 + 等待秒数可见 + 支持推理模型的 reasoning_content + 清理跨刷新残留的空回复 + 新增「测试模型」探针\n// v18：页面侧把 LLM 配置（API Base/模型/Key）也打包进手机配置链接，同步被拦也能用\n// v17：新增 message('version') 回报当前离线壳版本（识别'手机里装的是旧壳'）；页面侧可一键重置壳
// v16：诊断新增「环境」行（识别浏览器+UA）；非 Safari 浏览器（Chrome/Edge/夸克/UC…）打开时弹「请用 Safari」引导\n// v15：同步层整体重做为「个人工作台」同款（内容不同即整份采纳云端，弃用时间戳比较+深合并）；诊断新增 workbench 表对照探针\n// v14：拉取失败自动双探针（结果并入诊断）；报错文案缩短；启动时清洗历史脏 key；toast 限宽
// v13：移动端全面自适应（≤980px 弹窗紧凑、诊断按钮纵向堆叠、横屏分栏、≤380px 极窄屏优化）
// v12：微信/QQ 内置浏览器打开时弹出「请用 Safari 打开」引导（webview 无 SW 且常拦 supabase.co）
// v11：移除「欢迎使用」自动弹窗；新增「测试连接」双探针（极简 GET vs 带预检 GET，原始报错直出）；拉取失败 3s 自动补拉
// v10：自检面板显示「云端模型 vs 本机模型」对照；网络错误文案补 iOS 主屏 App 联网权限排查
// v9：修「手机模型一直是 openai」——
//     1) pushCloud 不再"先落时间戳再发请求"（失败会把本地时间戳推到未来，设备从此拉不到云端）
//     2) 本机没配 API Key 而云端有时 → 无条件采纳云端（白板没资格挡住云端配置）
//     3) 设置里新增「以云端为准刷新本机」强制拉取
// v8：修「手机同步失败」排查到的两个环境问题——
//     1) 页面导航一律 no-store，绕开 GitHub Pages 的 max-age=600（老用户看不到新版）
//     2) 缓存版本 +1，强制已装用户换新壳
// v7：手机端顶部常显「设置/导出」按钮（原来文字被隐藏又无图标，看起来像没有设置入口）
// v6：新增「从链接导入配置」（iOS 主屏 App 与 Safari 存储独立，必须 App 内导入）
// v5：修同步新旧判定 / 拆 push·pull 锁
// v3：应用更名（贝语）+ 导航改「网络优先」
// v2：导航由缓存优先改网络优先（否则老用户永远看到旧版）
const CACHE = 'beiyu-v24';
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

// 页面可用 postMessage('version') 询问当前离线壳版本——手机上"改了前端还是失败"可能是壳本身是旧的。
self.addEventListener('message', (e) => {
  if (e.data === 'version' && e.source) {
    e.source.postMessage({ type: 'sw-version', cache: CACHE });
  }
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // 跨域（LLM API / Supabase）一概不插手
  if (url.origin !== self.location.origin) return;

  // 页面导航 + manifest：网络优先 → 保证拿到最新版；断网时回退缓存
  // （manifest 决定主屏图标名，缓存优先会让改名延迟生效）
  const netFirst = e.request.mode === 'navigate' || /manifest\.json$/.test(url.pathname);
  if (netFirst) {
    // no-store：GitHub Pages 会给 HTML 打 max-age=600，只用"网络优先"仍可能拿到十分钟前的旧页面
    // （改完前端、手机上却没变，多半就是它）
    const req = new Request(e.request.url, {
      method: 'GET',
      cache: 'no-store',
      mode: 'same-origin',
      credentials: 'same-origin',
      redirect: 'follow',
    });
    e.respondWith(
      fetch(req).then(r => {
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
