# 醉语 · 深夜酒馆

一间自托管的私人 AI 叙事酒馆。角色、世界书、提示词、对话样式与结构化输出，全部由你定义。

参考 SillyTavern 的成熟能力，重新设计为一套现代化 Web 应用：兴趣广场、一键情景模板、自带 OpenAI 兼容 API、会话分支、聊天主题、结构化消息渲染，以及暖金色的深夜酒馆视觉。

> 部分能力仍在开发中，实际实现进度见文末「当前进度」。

## 功能

- **兴趣广场**：官方与用户投稿的情景模板，分类、标签、榜单、收藏、评分；一键克隆为可编辑资产并开始对话。
- **自带 AI**：任意 OpenAI 兼容接口（OpenAI、DeepSeek、Moonshot、Ollama、vLLM 等），保存前可自动拉取 `/models` 模型列表，可调温度、top_p、最大 token、上下文窗口。
- **创作资产**：角色卡、世界书、提示词预设、用户身份（persona）、快捷回复、对话样式、主题、输出格式、对话模板。
- **AI 辅助创作**：在创作工坊用一句灵感生成角色、世界书、提示词、对话样式或聊天主题，实时预览后保存为可编辑资产；提供可复制的 JSON Schema 文档。
- **结构化输出**：JSON Schema 2020-12 + `x-ui` 渲染指令，AI 返回的 JSON 会被校验并渲染为卡片、档案、物品栏等自定义样式。
- **对话体验**：SSE 流式输出、重新生成、分支树、回溯、自动标题。
- **记忆与上下文压缩**：会话级长期记忆（永久 / 隐藏 / 摘要 / 笔记，可调重要度与启用状态），手动或按阈值自动把早期对话压缩为前情摘要；摘要绑定分支，回溯后不会串线。
- **聊天主题**：用受控设计令牌调整聊天页的背景、正文、主色、圆角与字体，可叠加背景图与净化后的自定义 CSS；支持默认主题、模板引用与 AI 生成。
- **导入导出**：SillyTavern PNG 角色卡与 JSON 角色卡/世界书导入；角色卡与世界书导出。
- **多用户隔离**：邀请码注册、会话与资产按用户隔离、可撤销会话、API Key AEAD 加密。
- **管理后台**：邀请码、用户、广场审核、共享 API 授权、系统设置与审计日志。

### 主题怎么用

在「主题」里从暖金酒馆、青灯夜雨、旧纸晨光或赛博霓虹开始，调整色板后保存。主题可以设为默认，新对话会自动使用；也可以在对话设置里单独切换，或通过对话模板绑定。主题只作用于聊天页，不会改变整座酒馆的界面。

- 设计令牌：`--background`、`--foreground`、`--card`、`--primary`、`--secondary`、`--muted`、`--accent`、`--border`、`--ring`、`--radius`、`--font-sans`、`--font-display` 等。
- 自定义 CSS 可写 `.zy-bubble`、`.zy-content`、`.zy-name`、`.zy-avatar`、`.zy-message`，保存时自动限定在 `.zy-chat` 作用域内。
- 背景图支持站内上传或 http(s) 链接；聊天页会叠加一层主题背景色以保证文字可读。

### 记忆与上下文压缩怎么用

在聊天页右上角点开脑图标，进入「记忆与压缩」面板。

- **长期记忆**：可新增永久、隐藏、摘要或笔记类型的记忆，设置标题、重要度与启用状态。注入预算按会话上下文窗口动态计算（约 12%，最低 800、最高 3000 tokens），重要度高的记忆优先保留；关闭「注入长期记忆」即可整体停用。
- **手动压缩**：点「立即压缩」会把当前分支的早期对话交给当前会话的模型，生成 300–600 字的前情摘要，并保留最近若干条原文。适合在长篇对话开始变慢或变贵时主动整理。
- **自动压缩**：默认关闭。开启后，当尚未被摘要覆盖的对话 token 超过可用上下文的阈值（默认 60%）时，会在下一次回复前自动压缩；「保留最近」默认 12 条，可自行调整。已有摘要时只检查新增部分，不会每轮重复压缩。压缩会产生一次额外的模型调用。
- **分支安全**：摘要绑定创建时的分支叶子节点。回溯或切换到其他分支后，旧摘要会自动失效，提示词回退到原有的截断策略，避免把另一条时间线的剧情带进来。
- **失败回退**：自动压缩失败不会阻断正常回复，本次请求仍按截断策略组装提示词。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | Next.js 16（App Router / Turbopack）、React 19、TypeScript |
| 样式 | Tailwind CSS 4、shadcn/ui（Radix）、暖金设计令牌 |
| 数据库 | MySQL 8、Drizzle ORM、UUIDv7、软删除 |
| 认证 | jose（HS256 JWT）+ 数据库会话、bcryptjs、邀请码 |
| AI | OpenAI 兼容 Chat Completions、SSE 流式解析 |
| 校验 | Zod、ajv（JSON Schema）、css-tree（自定义 CSS 白名单） |
| 部署 | Docker Compose（inline build、BuildKit 依赖缓存、standalone 产物） |

## 快速开始（本地开发）

要求：Node.js 22+、可访问的 MySQL 8。

```bash
cp .env.example .env.local
# 编辑 .env.local：DATABASE_URL、AUTH_SECRET、API_KEY_ENC_SECRET、ADMIN_PASSWORD
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

打开 <http://localhost:3000>。`db:seed` 会创建管理员、初始邀请码与广场分类，邀请码会打印在终端（也只在首次创建时打印）。

### 在 VS Code 中启动

项目内置 `.vscode/launch.json`，只有一个名为 **启动醉语** 的配置。用 VS Code 打开项目根目录，按 `F5` 或点击左侧「运行与调试」的绿色启动按钮，就会直接启动开发服务器；就绪后自动用默认浏览器打开页面。

首次启动前仍需执行 `npm run db:migrate` 和 `npm run db:seed`。

生成密钥：

```bash
openssl rand -base64 32
```

## Docker Compose 部署

```bash
cp .env.example .env
# 编辑 .env（至少填写 DATABASE_URL、AUTH_SECRET、API_KEY_ENC_SECRET、APP_URL）
docker compose up -d --build
```

Compose 会依次执行：

1. `migrate`：在 `GET_LOCK` 保护下应用 Drizzle 迁移；
2. `seed`：创建管理员、初始邀请码、广场分类（幂等）；
3. `app`：启动 standalone 生产服务。

查看初始邀请码：

```bash
docker compose logs seed
```

依赖安装使用 BuildKit 缓存挂载（`/root/.npm`），修改源码不会重新下载依赖。镜像基于 `node:22-alpine`，`sharp` 等原生依赖在 Alpine 上安装。

上传文件保存在命名卷 `uploads` 中，重建容器不会丢失。

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 是 | MySQL 连接串；数据库不存在时自动创建（需要 CREATE 权限） |
| `DB_POOL_SIZE` | 否 | 连接池大小，默认 10 |
| `AUTH_SECRET` | 是 | JWT 签名密钥，至少 32 字符 |
| `API_KEY_ENC_SECRET` | 是 | API Key 加密密钥，至少 32 字符，独立于 AUTH_SECRET |
| `APP_URL` | 是 | 对外地址，用于 Cookie Secure 与 CSRF 校验 |
| `APP_PORT` | 否 | Docker 映射端口，默认 3000 |
| `ADMIN_USERNAME` | 否 | 初始管理员用户名，默认 `admin` |
| `ADMIN_PASSWORD` | 否 | 仅首次创建管理员时使用；缺省则随机生成并打印 |
| `ADMIN_DISPLAY_NAME` | 否 | 管理员昵称 |
| `ALLOW_PRIVATE_PROVIDER_URLS` | 否 | 是否允许 AI 接口使用私网地址，默认 false |
| `UPLOAD_DIR` | 否 | 上传目录，默认 `./public/uploads` |
| `MAX_UPLOAD_MB` | 否 | 单文件大小上限，默认 8 |

> 生产部署请使用 HTTPS，并把 `APP_URL` 设置为实际域名。`AUTH_SECRET` 与 `API_KEY_ENC_SECRET` 一旦更换，现有登录会话与已保存的 API Key 会失效。

## 常用脚本

```bash
npm run dev          # 开发
npm run build        # 生产构建
npm run start        # 启动生产构建
npm run typecheck    # TypeScript 检查
npm run lint         # ESLint
npm run db:generate  # 根据 schema 生成迁移
npm run db:migrate   # 应用迁移
npm run db:seed      # 管理员 / 邀请码 / 分类 / 系统设置
npm run db:studio    # Drizzle Studio
```

## 目录结构

```
src/
  app/
    (auth)/            登录、注册
    (app)/             登录后的酒馆主界面
    api/               Route Handlers（认证、内容、聊天、广场、管理）
  components/
    auth/              登录注册表单
    brand/             品牌标识
    common/            页头、空状态等
    layout/            AppShell、侧边栏、用户菜单
    ui/                shadcn/ui 组件
  db/
    schema/            Drizzle 表定义（auth/providers/content/chat/plaza/ops）
  lib/
    auth/              JWT、密码、会话、守卫、邀请码、CSRF
    client/            浏览器端请求封装
    crypto/            API Key AEAD 加解密
    validation/        Zod 校验
  proxy.ts             路由保护（Next 16 Proxy）
drizzle/               迁移 SQL
scripts/               迁移与种子脚本
compose.yaml           Docker Compose（inline Dockerfile）
```

## 安全说明

- API Key 经 AEAD 加密后入库，界面只回显末四位。
- 登录 Cookie 为 `HttpOnly`、`SameSite=Lax`，HTTPS 下自动加 `Secure`。
- 写接口校验 Origin 与 `Sec-Fetch-Site`，无来源头的写请求一律拒绝；Cookie 会话可撤销，修改密码会注销其他设备。
- 对话样式与主题的自定义 CSS 在保存前经 css-tree 白名单清洗：删除 at-rule 与危险属性，拒绝 `url()`、`expression()` 等值，并自动把选择器限定在 `.zy-chat` 内；渲染时会再次清洗。
- 主题变量只允许覆盖受控的设计令牌，背景图仅接受站内上传路径或 http(s) 链接。
- 会话记忆与压缩摘要按用户和会话双重校验归属，跨用户读写一律返回 404。
- AI 供应商地址默认禁止私网/回环地址，防止 SSRF；自托管模型可显式开启。
- 上传文件校验魔数并用 sharp 重新编码，避免伪装图片。
- 生产环境建议在反向代理层再加限流与 HTTPS。

## 当前进度

- [x] P0 基础：数据库 schema/迁移、认证、邀请码、登录注册、AppShell、Docker Compose
- [x] P1 创作资产：角色 / 世界书 / 提示词 / 样式 / 输出格式 / 模板 CRUD
- [x] P2 对话核心：SSE 流式、提示词组装、世界书激活、分支与重新生成
- [x] P3 广场：投稿与版本、审核、克隆、榜单、搜索、点赞收藏与评分
- [x] P4 结构化渲染与 AI 辅助创作（角色 / 世界书 / 提示词 / 样式生成、Schema 文档）
- [x] P5 管理后台、导入导出、图片上传（用户 / 邀请码 / 广场审核 / 共享 API / 系统设置 / 审计日志）
- [x] P6 安全加固与端到端验证（自定义 CSS、主题系统、CSRF 收紧、AI 主题生成）
- [x] P7 会话记忆与上下文压缩（记忆面板、手动 / 自动压缩、分支绑定与失败回退）

> 尚未接入：对话导出。Docker Compose 构建未在当前开发机验证，部署前请先执行一次 `docker compose build`。
