# 贝语 · 部署与使用指南

一个只属于你的对话空间。它会记住你的全部对话和原则，每次回复都基于你的长期信念给你直给的反馈。

---

## 1. 在 Supabase 建表（多设备同步必做）

进 Supabase 项目（`ihuikxutnvhfgmfmcxis`） → SQL Editor → 跑下面这条：

```sql
create table if not exists soul_chat (
  id text primary key,
  data jsonb,
  updated_at timestamptz default now()
);

alter table soul_chat enable row level security;

-- 个人自用，开最宽松的策略即可（你的 anon key 本身权限有限）
drop policy if exists "public all" on soul_chat;
create policy "public all" on soul_chat for all using (true) with check (true);
```

（`if not exists` + `drop policy if exists` 让它重复执行也不报错，放心多跑几次。）

跑完点 **Run**，看到 `Success. No rows returned` 就是成了。

**注意**：不建表也能用，但那样电脑和手机是**两份独立数据**，互相看不到。想两边同步，这一步必须做。

## 2. 本地试用

```bash
cd soul-chat
python3 -m http.server 8765
# 或用任意静态服务器
```

打开 `http://localhost:8765`

## 3. 部署（已完成 ✅）

**线上地址：https://sky4774234-collab.github.io/soul-chat/**

- 仓库：`sky4774234-collab/soul-chat`（public，main 分支根目录）
- GitHub Pages 已开启，自动 HTTPS（PWA 添加主屏幕必需）
- 电脑和手机访问**同一个地址**

### 以后怎么更新

**方式 A（最省事）**：改完文件跟 AI 说一声"推到 soul-chat"，它帮你 commit + push。

**方式 B（自己推）**：需要用你的 GitHub 账号认证一次。

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token，勾上 `repo` 权限
2. 终端里跑：
   ```bash
   cd soul-chat
   git add -A && git commit -m "改了啥"
   git push origin main
   ```
   用户名填 `sky4774234-collab`，密码**粘贴那个 token**（不是账号密码）
3. macOS 会把它记进钥匙串，之后就不用再输

**方式 C（零环境）**：直接上 GitHub 网页打开仓库 → 点 `index.html` → 铅笔图标编辑 → Commit changes。适合只改几行文案。

推送后等约 1 分钟 Pages 自动重建。浏览器可能要强刷（`⌘+Shift+R`）才看到新版。

### 首次访问 404？

Pages 首次构建有 1–2 分钟延迟，刷新一下就好。

## 4. 首次配置

打开 → 弹出欢迎 → 点 "去配置"：

- **API Base**: 你的 LLM 服务地址
  - OpenAI: `https://api.openai.com/v1`
  - DeepSeek: `https://api.deepseek.com/v1`
  - Anthropic 走代理的需要兼容 OpenAI 格式
  - 自部署的也填对应地址
- **API Key**: 你的 key
- **模型**: 名字，比如 `gpt-4o-mini`、`deepseek-chat`、`claude-3-5-sonnet-20241022`（取决于你的代理）

填完保存，就可以开始对话。

> **手机上不用再填一遍 API Key。** API Key 存在云端的 `settings` 里，
> 手机只要配好同步（Supabase URL + Anon Key），首次拉取时会自动带过来。
> 最快的做法见「6. 手机 PWA 全屏」里的**两种配置方式**：
> 电脑上设置 → 点「生成手机配置链接」→ 复制 → 手机用**方式 B（主屏 App 里粘贴导入）**。

## 5. 录入原则

左侧"它记住的事"面板 → 一条一条写。每条原则：
- 直接编辑（点文字就能改）
- 失焦自动保存
- 鼠标悬停出现 × 按钮删除（手机上常显，直接点）

AI 每次回复都会把这些原则带进 system prompt，所以建议一开始就把最核心的几条录进去。

## 5.5 不受上下文限制（自动压缩长期记忆）

**这是关键**。哪怕你跟它聊了一年、几万条消息，AI 也不会因为 token 限制而失忆。机制：

- 你的全部对话都存在本地和 Supabase 里，**不截断**。
- 每攒够 20 条新对话，AI 会自动调用一次"压缩"：把那段对话提炼成 200 字以内的"关键脉络"，拼到 system prompt 的一段"长期记忆"里。
- 每次回复时，AI 实际看到的是：系统人设 + 你的原则 + 全部历史脉络 + 最近 20 条原话。
- 顶栏有个 **记忆指示器**（蓝色小圆点）：`已压缩 X / 总 Y`。蓝色说明已经有脉络了。

设置 → 长期记忆 区块可以：
- 看 / 编辑 / 完全清空脉络（清空不影响对话原样）
- 调"保留最近多少条原样"（4–80）
- 关掉自动压缩（不推荐，除非你很在意 token 花费）
- 手动触发"立即压缩"

如果你想完全控制脉络：直接在设置里把脉络文本框清空 / 重写，保存即可。AI 下次就用你写的脉络。

## 6. 手机 PWA 全屏

iPhone Safari 打开部署后的网址 → 分享按钮 → "添加到主屏幕" → 桌面图标"贝语"。

之后从桌面点开就是全屏体验，没有 Safari 地址栏。

### 手机零手填：两种方式（**iOS 必须用第二种**）

手机上要配的是 **Supabase 的 URL + Anon Key**（不是 LLM 的 API Key），
而同步配置本身存在各自的浏览器里、没法靠同步下发（鸡生蛋问题）。

> ⚠️ **iOS 的关键区别：主屏 App 与 Safari 是两套独立存储。**
> 「添加到主屏幕」的 App 有自己的存储沙盒，跟 Safari 互不相通。
> 所以在 Safari 里点开配置链接，配置**不会**传进主屏那个 App（反过来也一样）。
> 删除主屏图标时，**它的本地数据会一起被删掉**（云端有数据就没事，重开会自动拉回）。

**方式 A — 在 Safari 里用（普通网页标签）**

电脑上设置 → 同步区块 → 点 **「生成手机配置链接」** → **复制** →
发到微信/备忘录 → 手机**在 Safari 里**点开，URL 和 Key 自动填好并开启同步，地址栏参数随后自动清除。

**方式 B — 在主屏 App 里用（iOS 推荐）**

1. 先把链接复制到手机（微信/备忘录/直接复制）
2. 打开主屏的「贝语」App → 设置 → 同步区块
3. 在 **「从链接导入配置」** 的框里**长按粘贴**（粘上就自动导入），
   或点 **「读剪贴板导入」** 直接读剪贴板
4. 导入成功后顶栏小圆点变**绿色**，API Key 在几秒内自动从云端取回

两种方式都支持整条链接 / JSON / 纯文本两段。

**导入后你最该看到的两件事**：
1. 顶栏小圆点变**绿色**（已连接）
2. 设置里的 API Key 那一栏**自动填好了**（从云端同步下来的）

如果 Key 是空的、还弹了"未配置"窗，说明同步没连上——圆点会是红色，看提示。

### 换应用名（图标名）后手机怎么更新

iOS 的主屏图标名是「添加到主屏幕」那一刻拍快照的，**改配置不会自动跟着变**，只能删掉重加：

1. 先确认云端没问题（先别急着删——删图标会连本地数据一起清掉）
2. 长按主屏图标 → 删除 App
3. Safari 打开网址 → 分享按钮 → 添加到主屏幕（这时默认名已经是新的）
4. 打开新图标 → 按上面的「方式 B」导入配置 → 数据从云端拉回

---

## 核心交互速查

| 操作 | 快捷方式 |
|------|---------|
| 发送 | 点发送按钮 或 `⌘+Enter` / `Ctrl+Enter` |
| 折叠左侧（手机） | 点"收起" |
| 添加原则 | 点"+ 新增原则" |
| 编辑原则 | 直接点文字 |
| 删除原则 | 鼠标悬停 → ×（手机上常显） |
| 手机零配置 | 设置 →「生成手机配置链接」→ 复制 → 手机 Safari 点开（iOS 主屏 App 用「粘贴导入」） |
| 导出全部数据 | 顶栏 "导出" 按钮（生成 JSON） |
| 设置 | 顶栏 "设置" |

---

## 数据流向

```
本地浏览器 (localStorage)
     ↕ pushCloud / pullCloud（15s 轮询）
Supabase 表 soul_chat
     ↕ 浏览器直接 fetch
LLM API（OpenAI 兼容）
```

- 任何本地改动 → 立即 push 到云
- 每 15s 从云拉取最新 → 若远端有新数据则替换本地
- 永远以本地为准发起 push（last-write-wins）

LLM 调用直接从浏览器打到 API endpoint（Key 在浏览器端和 Supabase 里，不上传到任何第三方服务器）。

每 20 条新对话之后，会有一次额外的 LLM 调用做"压缩"——把老对话浓缩成 200 字以内的脉络，塞进 system prompt。这就是"不受上下文限制"的关键。