# 心语 · 部署与使用指南

一个只属于你的对话空间。它会记住你的全部对话和原则，每次回复都基于你的长期信念给你直给的反馈。

---

## 1. 在 Supabase 建表（可选，云同步需要）

进 Supabase 项目（`ihuikxutnvhfgmfmcxis`） → SQL Editor → 跑下面这条：

```sql
create table soul_chat (
  id text primary key,
  data jsonb,
  updated_at timestamptz default now()
);

alter table soul_chat enable row level security;

-- 个人自用，开最宽松的策略即可（你的 anon key 本来权限也有限）
create policy "public all" on soul_chat for all using (true) with check (true);
```

不启用同步也可以用，只是数据只存本地浏览器。

## 2. 本地试用

```bash
cd soul-chat
python3 -m http.server 8765
# 或用任意静态服务器
```

打开 `http://localhost:8765`

## 3. 部署到 GitHub Pages

跟工作台一样走老路：

1. 在 GitHub 新建仓库（比如 `xinyu` 或 `soul-chat`）
2. 把 `soul-chat/` 里的所有文件 push 上去（**不要包含 `_make_icons.py`**，那是开发用的）
3. Settings → Pages → 选 `main` 分支根目录
4. 等几分钟，访问 `https://<你的用户名>.github.io/<repo名>/`

或者直接 CloudStudio 部署一份（跟工作台一个套路），但不推荐长期用——CloudStudio 免费沙盒偶尔 502。

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

## 5. 录入原则

左侧"它记住的事"面板 → 一条一条写。每条原则：
- 直接编辑（点文字就能改）
- 失焦自动保存
- 鼠标悬停出现 × 按钮删除

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

iPhone Safari 打开部署后的网址 → 分享按钮 → "添加到主屏幕" → 桌面图标"心语"。

之后从桌面点开就是全屏体验，没有 Safari 地址栏。

---

## 核心交互速查

| 操作 | 快捷方式 |
|------|---------|
| 发送 | 点发送按钮 或 `⌘+Enter` / `Ctrl+Enter` |
| 折叠左侧（手机） | 点"收起" |
| 添加原则 | 点"+ 新增原则" |
| 编辑原则 | 直接点文字 |
| 删除原则 | 鼠标悬停 → × |
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