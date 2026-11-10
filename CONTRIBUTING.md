# 为 Strata 贡献代码

**简体中文** · [English](#english)

感谢你对 Strata 的关注！任何形式的贡献都很有价值。本文档会说明如何快速搭建环境并完成第一次贡献。

## 提交 Issue

提交新 Issue 之前，请先在 [issues](https://github.com/makestrata/strata/issues) 里搜索一下。可能已经有人提过同样的问题或讨论，里面也许就有现成的绕行方案；如果没有，你也可以补充新的信息。

我们希望修复所有 [issues](https://github.com/makestrata/strata/issues)，但在动手修之前必须先能复现并确认问题。请用仓库或 [Gist](https://gist.github.com/) 提供一个最小复现场景。一个可运行、可复现的场景能直接回答这些我们本来要来回追问的问题：

- 用到了哪些第三方库、版本是多少
- 在什么使用场景下会失败

没有最小复现，我们无法逐个排查 [issues](https://github.com/makestrata/strata/issues)，问题可能就一直悬着。

你可以通过[这个表单](https://github.com/makestrata/strata/issues/new)新建 Issue。

### Issue 标题约定

新建 Issue 时，请用清晰简洁的标题，并遵循以下格式：

- Bug：`🐛 Bug: [简短描述]`
- 新功能：`🚀 Feature: [简短描述]`
- 改进：`🛠️ Improvement: [简短描述]`
- 文档：`📘 Docs: [简短描述]`

**示例：**

- `🐛 Bug: API token expiry time not saving correctly`
- `📘 Docs: Clarify RAM requirement for local setup`
- `🚀 Feature: Allow custom time selection for token expiration`

这样便于我们分类和跟进。

## 项目结构与架构

### 环境要求

- 已安装并运行 Docker Engine
- Node.js **22.22.0+**（仓库通过 `.node-version` 固定版本，`package.json` 的 `engines` 要求 `>=22.22.0`）
- Python **3.12** 与 [uv](https://docs.astral.sh/uv/) **0.12.21**（仅在 Docker 之外单独跑 API 时需要）
- PostgreSQL **15.7**（`docker-compose-local.yml` 中的镜像版本）
- Valkey / Redis **7.2.11**
- **内存**：建议至少 **12 GB RAM**
  > ⚠️ 在只有 8 GB 内存的机器上运行，可能在构建/启动容器或安装依赖时失败甚至崩溃。条件允许的话请使用 GitHub Codespaces 之类的云端环境，或升级本机内存。

### 搭建项目

本仓库是 monorepo：后端 API 与前端都在同一个仓库里。后端是 Django 项目，位于 `apps/api`。

1. 克隆仓库

```bash
git clone https://github.com/makestrata/strata.git [folder-name]
cd [folder-name]
chmod +x setup.sh
```

2. 执行 `setup.sh`

```bash
./setup.sh
```

该脚本会：把根目录与各子应用的 `.env.example` 复制为 `.env`、为 Django 生成 `SECRET_KEY`、为对象存储（MinIO）生成一组访问密钥并同时写入根 `.env` 与 `apps/api/.env`、启用 corepack 并执行 `pnpm install`。

3. 启动依赖服务

```bash
docker compose -f docker-compose-local.yml up
```

4. 启动前端应用

```bash
pnpm dev
```

5. 浏览器打开 <http://localhost:3001/god-mode/>，把自己注册为实例管理员
6. 再打开 <http://localhost:3000>，用上一步的账号登录

到这里就可以开始写代码了。如果改动没有自动热更新，刷新一下浏览器。祝你贡献愉快！🎉

### 不使用 Docker 运行（Windows）

本机跑不了 Docker，或者不想为开发环境留出 12 GB 内存时，可以用仓库根目录的 `local-dev.cmd` 起一套纯本地环境：

```powershell
.\local-dev.cmd             # 启动并进入交互日志监控（O/S/L/Q/X 快捷键）
.\local-dev.cmd -Detach     # 后台启动并立即返回
.\local-dev.cmd -Status     # 查看状态
.\local-dev.cmd -Stop       # 全部停止
.\local-dev.cmd -ResetDb    # 删除并重建本地数据库
```

它不需要 Docker，也不需要先跑 `setup.sh`：脚本会直接用本机已安装的 PostgreSQL 二进制（`initdb.exe`、`pg_ctl.exe`、`psql.exe`）在 `.local\pgdata` 初始化一个独立集群，监听 **55432**，不碰你机器上已有的 5432 服务，也不需要那套服务的密码。数据、日志、进程号都在 `.local\` 下，已加入 `.gitignore`。

前置条件：Windows、PowerShell 5.1+、Node.js 22.22+、pnpm、[uv](https://docs.astral.sh/uv/) 0.12.21，以及本机安装的 PostgreSQL 15+（只用到它的命令行工具）。

常用参数：

- `-Apps web,admin` —— 只启动指定前端（默认 `web`、`admin`、`space`，`live` 需要 Redis）；
- `-SkipFrontend` / `-SkipApi` —— 只起后端 / 只起前端；
- `-DatabaseUrl "postgresql://user:pass@host:5432/strata"` —— 用已有数据库替代私有集群。

与 Docker 方式的差异：

| 能力     | Docker 方式            | `local-dev.cmd`                                                                          |
| -------- | ---------------------- | ---------------------------------------------------------------------------------------- |
| 数据库   | 容器内 PostgreSQL 15.7 | 本机 PostgreSQL 私有集群（55432）                                                        |
| Redis    | Valkey 容器            | 可选：PATH 或 `.local\bin\` 下有 `redis-server.exe` 就自动启动，否则缓存降级为进程内缓存 |
| 对象存储 | MinIO 容器             | 可选：有 `minio.exe` 就自动启动，否则附件上传不可用                                      |
| 后台任务 | worker + beat 容器     | 不执行（Celery 走 `memory://`）                                                          |

首次 `uv sync` 要下载 123 个 Python 包，国内网络建议加 `-Mirror`（走清华 PyPI 镜像）：

```powershell
.\local-dev.cmd -Mirror
```

启动完成后浏览器打开 <http://localhost:3001/god-mode/> 注册实例管理员，再用同一账号登录 <http://localhost:3000>。

## 缺了某个功能？

如果缺少你想要的功能，可以直接在[这里](https://github.com/makestrata/strata/issues/new?assignees=&labels=feature&template=feature_request.yml&title=%F0%9F%9A%80+Feature%3A+)提需求，也可以在 GitHub 仓库里选择「🚀 Feature」新建 [Issue](https://github.com/makestrata/strata/issues/new/choose)。

如果你想自己**实现**这个功能，请先提交方案 Issue，确认方向可用之后再动手。并请遵守下面的编码约定。

## 编码约定

为保持代码风格一致，请遵守以下规则：

- 所有新功能或 bug 修复都必须有对应的测试（单元测试）。
- 我们使用 [OxLint](https://oxc.rs/docs/guide/usage/linter)（配置见 `.oxlintrc.json`）做 lint，使用 [oxfmt](https://oxc.rs/docs/guide/usage/formatter)（配置见 `.oxfmtrc.json`）做格式化。
- 提交前建议跑一遍 `pnpm check`（格式 + lint + 类型），需要自动修复时用 `pnpm fix`。
- 使用 AI 编码代理（Claude Code、Codex 等）协作时，请让它先读仓库根目录的 [AGENTS.md](./AGENTS.md)。

## 贡献方式

- 试用 Strata Cloud 与私有化部署，并把反馈告诉我们
- 新增集成
- 新增或更新翻译
- 参与处理开放的 [issues](https://github.com/makestrata/strata/issues)，或[自己提一个](https://github.com/makestrata/strata/issues/new/choose)
- 分享你的想法和建议
- 帮忙写教程和博客
- 通过提案请求新功能
- 报告 bug
- **改进文档** —— 修掉不完整或有误的[文档](https://docs.strata.so/)、糟糕的措辞、缺失的示例和解释

## 参与多语言支持

本节说明如何在本应用里新增或更新翻译。

### 翻译文件结构

#### 文件组织

翻译按语言放在 `packages/i18n/src/locales` 目录下，每种语言一个文件夹，里面是 JSON 文件：

```
packages/i18n/src/locales/
    ├── en/
    │   ├── core.json       # 关键翻译
    │   └── translations.json
    ├── fr/
    │   └── translations.json
    ├── zh-CN/
    │   └── translations.json
    └── [language]/
        └── translations.json
```

#### 嵌套结构

为了便于管理和定位，key 采用嵌套结构：

```json
{
  "issue": {
    "label": "Work item",
    "title": {
      "label": "Work item title"
    }
  }
}
```

### 翻译格式

动态内容（变量、复数）使用 [IntlMessageFormat](https://formatjs.github.io/docs/intl-messageformat/) 处理：

- **简单变量**

  ```json
  {
    "greeting": "Hello, {name}!"
  }
  ```

- **复数**

  ```json
  {
    "items": "{count, plural, one {Work item} other {Work items}}"
  }
  ```

### 更新约定

#### 修改已有翻译

1. 在 `locales/<language>/translations.json` 中定位对应 key。
2. 修改 value，保持 key 结构不变。
3. 保留已有的 ICU 格式（变量、复数等）。

#### 新增翻译 key

1. 新 key 必须加到**所有**语言文件中，即使暂时没有译文——可以先填英文占位。
2. 各语言的嵌套结构要保持一致。
3. 如果新 key 需要动态内容（变量、复数），ICU 格式要在所有语言中统一使用。

### 新增语言

新增一种语言需要以下几步：

1. **更新类型定义**

```ts
// packages/i18n/src/types/language.ts
export type TLanguage = "en" | "fr" | "your-lang";
```

2. **添加语言配置**

```ts
// packages/i18n/src/constants/language.ts
export const SUPPORTED_LANGUAGES: ILanguageOption[] = [
  { label: "English", value: "en" },
  { label: "Your Language", value: "your-lang" },
];
```

3. **创建翻译文件**
   1. 在 `locales/` 下新建语言文件夹（如 `locales/your-lang/`）。
   2. 在其中添加 `translations.json`。
   3. 复制一份现有翻译文件的结构，并翻译全部 key。

4. **更新语言加载逻辑**

```ts
private importLanguageFile(language: TLanguage): Promise<any> {
  switch (language) {
    case "your-lang":
      return import("../locales/your-lang/translations.json");
    // ...
  }
}
```

### 提交前检查清单

- 所有翻译 key 在每个语言文件中都存在。
- 各语言文件的嵌套结构一致。
- ICU 消息格式正确。
- 所有语言在应用中都能正常加载。
- 动态值和复数显示正确。
- 没有漏翻或缺失的 key。

#### 小技巧

- 拿不准时，参考英文翻译理解上下文。
- 用不同的数字验证复数是否正确。
- 确认动态值（如 `{name}`）正确插值。
- 再核对一遍嵌套 key 的访问路径。

祝你翻译愉快！🌍✨

## 需要帮助？问题与建议

欢迎随时提问、提建议、聊想法。也可以到[论坛](https://forum.strata.so)找我们。

---

<br />

<a id="english"></a>

# Contributing to Strata

Thank you for showing an interest in contributing to Strata! All kinds of contributions are valuable to us. In this guide, we will cover how you can quickly onboard and make your first contribution.

## Submitting an issue

Before submitting a new issue, please search the [issues](https://github.com/makestrata/strata/issues) tab. Maybe an issue or discussion already exists and might inform you of workarounds. Otherwise, you can give new information.

While we want to fix all the [issues](https://github.com/makestrata/strata/issues), before fixing a bug we need to be able to reproduce and confirm it. Please provide us with a minimal reproduction scenario using a repository or [Gist](https://gist.github.com/). Having a live, reproducible scenario gives us the information without asking questions back & forth:

- 3rd-party libraries being used and their versions
- a use-case that fails

Without said minimal reproduction, we won't be able to investigate all [issues](https://github.com/makestrata/strata/issues), and the issue might not be resolved.

You can open a new issue with this [issue form](https://github.com/makestrata/strata/issues/new).

### Naming conventions for issues

- Bugs: `🐛 Bug: [short description]`
- Features: `🚀 Feature: [short description]`
- Improvements: `🛠️ Improvement: [short description]`
- Documentation: `📘 Docs: [short description]`

**Examples:**

- `🐛 Bug: API token expiry time not saving correctly`
- `📘 Docs: Clarify RAM requirement for local setup`
- `🚀 Feature: Allow custom time selection for token expiration`

This helps us triage and manage issues more efficiently.

## Projects setup and Architecture

### Requirements

- Docker Engine installed and running
- Node.js **22.22.0+** (pinned by `.node-version`, enforced by `engines` in `package.json`)
- Python **3.12** and [uv](https://docs.astral.sh/uv/) **0.12.21** (only needed to run the API outside Docker)
- PostgreSQL **15.7** (image used by `docker-compose-local.yml`)
- Valkey / Redis **7.2.11**
- **Memory**: Minimum **12 GB RAM** recommended
  > ⚠️ Running the project on a system with only 8 GB RAM may lead to setup failures or memory crashes (especially during Docker container build/start or dependency install). Use cloud environments like GitHub Codespaces or upgrade local RAM if possible.

### Setup the project

The project is a monorepo, with backend api and frontend in a single repo. The backend is a django project which is kept inside apps/api.

1. Clone the repo

```bash
git clone https://github.com/makestrata/strata.git [folder-name]
cd [folder-name]
chmod +x setup.sh
```

2. Run setup.sh

```bash
./setup.sh
```

It copies every `.env.example` to `.env`, generates a Django `SECRET_KEY`, generates the object storage credentials (written to both the root `.env` and `apps/api/.env`), enables corepack and runs `pnpm install`.

3. Start the containers

```bash
docker compose -f docker-compose-local.yml up
```

4. Start web apps:

```bash
pnpm dev
```

5. Open your browser to <http://localhost:3001/god-mode/> and register yourself as instance admin
6. Open <http://localhost:3000> and log in using the same credentials

That's it! Remember to refresh your browser if changes don't auto-reload. Happy contributing! 🎉

### Running without Docker (Windows)

If Docker is unavailable — or you would rather not reserve 12 GB of RAM for it — the `local-dev.cmd` script at the repo root boots the whole stack natively:

```powershell
.\local-dev.cmd             # start API + web apps, then enter interactive log monitoring
.\local-dev.cmd -Detach     # start in the background and return immediately
.\local-dev.cmd -Status     # show what is running
.\local-dev.cmd -Stop       # stop everything
.\local-dev.cmd -ResetDb    # drop and recreate the local database
```

It needs neither Docker nor a prior `setup.sh`: the script uses the PostgreSQL binaries already installed on the machine (`initdb.exe`, `pg_ctl.exe`, `psql.exe`) to create a private cluster in `.local\pgdata` listening on **55432**, so your existing 5432 server and its credentials are left untouched. Data, logs and PID files live under `.local\`, which is gitignored.

Requirements: Windows, PowerShell 5.1+, Node.js 22.22+, pnpm, [uv](https://docs.astral.sh/uv/) 0.12.21, and a local PostgreSQL 15+ install (only its CLI tools are used).

Options: `-Apps web,admin` limits the front ends (default `web`, `admin`, `space`); `-SkipFrontend` / `-SkipApi` start only one side; `-DatabaseUrl "postgresql://user:pass@host:5432/strata"` reuses an existing database instead of the private cluster.

Differences from the Docker setup:

| Capability      | Docker                    | `local-dev.cmd`                                                                                                      |
| --------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Database        | PostgreSQL 15.7 container | private local cluster on 55432                                                                                       |
| Redis           | Valkey container          | optional; auto-started when `redis-server.exe` is on PATH or in `.local\bin\`, otherwise an in-process cache is used |
| Object storage  | MinIO container           | optional; auto-started when `minio.exe` is available, otherwise uploads are unavailable                              |
| Background jobs | worker + beat containers  | not executed (Celery uses `memory://`)                                                                               |

The first `uv sync` downloads 123 Python packages; add `-Mirror` to use the Tsinghua PyPI mirror:

```powershell
.\local-dev.cmd -Mirror
```

Then open <http://localhost:3001/god-mode/> to register the instance admin and log in at <http://localhost:3000>.

## Missing a Feature?

If a feature is missing, you can directly _request_ a new one [here](https://github.com/makestrata/strata/issues/new?assignees=&labels=feature&template=feature_request.yml&title=%F0%9F%9A%80+Feature%3A+). You can also do the same by choosing "🚀 Feature" when raising a [New Issue](https://github.com/makestrata/strata/issues/new/choose).

If you would like to _implement_ it, an issue with your proposal must be submitted first.

## Coding guidelines

- All features or bug fixes must be tested by one or more specs (unit-tests).
- We lint with [OxLint](https://oxc.rs/docs/guide/usage/linter) using the shared `.oxlintrc.json` and format with [oxfmt](https://oxc.rs/docs/guide/usage/formatter) using `.oxfmtrc.json`.
- Run `pnpm check` (format, lint, types) before pushing; `pnpm fix` auto-fixes format and lint issues.
- If you work with an AI coding agent, point it at [AGENTS.md](./AGENTS.md) first.

## Ways to contribute

- Try Strata Cloud and the self hosting platform and give feedback
- Add new integrations
- Add or update translations
- Help with open [issues](https://github.com/makestrata/strata/issues) or [create your own](https://github.com/makestrata/strata/issues/new/choose)
- Share your thoughts and suggestions with us
- Help create tutorials and blog posts
- Request a feature by submitting a proposal
- Report a bug
- **Improve documentation** - fix incomplete or missing [docs](https://docs.strata.so/), bad wording, examples or explanations.

## Contributing to language support

### Understanding translation structure

```
packages/i18n/src/locales/
    ├── en/
    │   ├── core.json       # Critical translations
    │   └── translations.json
    ├── fr/
    │   └── translations.json
    └── [language]/
        └── translations.json
```

Keys are nested for maintainability:

```json
{
  "issue": {
    "label": "Work item",
    "title": {
      "label": "Work item title"
    }
  }
}
```

### Translation formatting guide

We use [IntlMessageFormat](https://formatjs.github.io/docs/intl-messageformat/) for dynamic content:

- **Simple variables**

  ```json
  {
    "greeting": "Hello, {name}!"
  }
  ```

- **Pluralization**

  ```json
  {
    "items": "{count, plural, one {Work item} other {Work items}}"
  }
  ```

### Contributing guidelines

#### Updating existing translations

1. Locate the key in `locales/<language>/translations.json`.
2. Update the value while ensuring the key structure remains intact.
3. Preserve any existing ICU formats (variables, pluralization).

#### Adding new translation keys

1. Add the key to **all** language files, even if translations are not immediately available; use English as a placeholder.
2. Keep the nesting structure consistent across all languages.
3. Apply the ICU format uniformly across all languages.

### Adding new languages

1. **Update type definitions**

```ts
// packages/i18n/src/types/language.ts
export type TLanguage = "en" | "fr" | "your-lang";
```

2. **Add language configuration**

```ts
// packages/i18n/src/constants/language.ts
export const SUPPORTED_LANGUAGES: ILanguageOption[] = [
  { label: "English", value: "en" },
  { label: "Your Language", value: "your-lang" },
];
```

3. **Create translation files**: add `locales/your-lang/translations.json` by copying an existing file and translating every key.

4. **Update the import logic**

```ts
private importLanguageFile(language: TLanguage): Promise<any> {
  switch (language) {
    case "your-lang":
      return import("../locales/your-lang/translations.json");
    // ...
  }
}
```

### Quality checklist

- All translation keys exist in every language file.
- Nested structures match across all language files.
- ICU message formats are correctly implemented.
- All languages load without errors in the application.
- Dynamic values and pluralization work as expected.
- There are no missing or untranslated keys.

## Need help? Questions and suggestions

Questions, suggestions, and thoughts are most welcome. We can also be reached in our [Forum](https://forum.strata.so).
