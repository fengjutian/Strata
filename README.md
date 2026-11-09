<p align="center">
  <b>Strata</b><br />
  面向所有团队的开源项目管理工具
</p>

<p align="center">
  <b>简体中文</b> · <a href="#english">English</a>
</p>

<p align="center">
  <a href="https://github.com/makestrata/strata/blob/master/LICENSE.txt"><img alt="License" src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" /></a>
  <a href="https://nodejs.org/"><img alt="Node.js" src="https://img.shields.io/badge/node-%E2%89%A522.22.0-339933?logo=node.js&logoColor=white" /></a>
  <a href="https://pnpm.io/"><img alt="pnpm" src="https://img.shields.io/badge/pnpm-11.10.0-F69220?logo=pnpm&logoColor=white" /></a>
  <a href="https://www.djangoproject.com/"><img alt="Django" src="https://img.shields.io/badge/Django-5.2-092E20?logo=django&logoColor=white" /></a>
</p>

Strata 是一个开源项目管理平台。它把工作项、周期、模块、视图、页面和数据分析放在同一个工作空间里，让团队专注于交付，而不是维护工具本身。

- **工作项（Work Items）**：富文本描述、文件上传、子属性和关联工作项。
- **周期（Cycles）**：用固定节奏推进工作，配合燃尽图跟踪进度。
- **模块（Modules）**：把复杂项目拆成边界清晰、可以独立推进的模块。
- **视图（Views）**：保存筛选条件，把最相关的工作项固定成可分享的视图。
- **页面（Pages）**：用富文本和 AI 能力记录想法，并一键转成工作项。
- **分析（Analytics）**：实时查看趋势、发现阻塞，让项目持续向前。

> Strata 仍在快速演进。欢迎在 [GitHub Issues](https://github.com/makestrata/strata/issues) 或[论坛](https://forum.strata.so)反馈问题与建议。

## 快速开始

### 方式一：使用 Strata Cloud

在 [Strata Cloud](https://app.strata.so) 注册免费账号，无需自建任何基础设施。

### 方式二：私有化部署

在自己的服务器上运行 Strata，数据和基础设施完全由自己掌控：

| 方式       | 文档                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| Docker     | [Docker Compose 部署](https://developers.strata.so/self-hosting/methods/docker-compose)                                 |
| Kubernetes | [Kubernetes 部署](https://developers.strata.so/self-hosting/methods/kubernetes)                                        |

实例管理员可以通过 [God mode](https://developers.strata.so/self-hosting/govern/instance-admin) 修改实例级配置。

### 方式三：本地开发

本地开发有两种运行方式，按习惯任选一种：

| 方式                      | 依赖                               | 适用场景                       |
| ------------------------- | ---------------------------------- | ------------------------------ |
| Docker Compose            | Docker Engine、Node.js、pnpm       | 跨平台，环境与生产保持一致     |
| 本机原生（Windows 脚本）  | PostgreSQL 15+、Python 3.12、uv    | 不想用 Docker，追求更快的启动  |

完整的贡献流程见 [CONTRIBUTING.md](./CONTRIBUTING.md)，AI 编码代理请先读 [AGENTS.md](./AGENTS.md)。

## 本地开发（Docker）

### 环境要求

- Docker Engine 已安装并运行
- Node.js **22.22.0+**（版本固定见 [.node-version](./.node-version)）
- pnpm **11.10.0**（通过 corepack 启用）
- 建议至少 **12 GB** 内存；8 GB 机器在构建镜像或安装依赖时可能失败

### 启动步骤

```bash
git clone https://github.com/makestrata/strata.git
cd strata

# 1. 生成各应用的 .env、Django SECRET_KEY 和对象存储凭据，并安装前端依赖
chmod +x setup.sh
./setup.sh

# 2. 启动 PostgreSQL、Redis、RabbitMQ、MinIO、API 与 Celery
docker compose -f docker-compose-local.yml up -d

# 3. 启动前端应用
pnpm dev
```

启动后：

1. 打开 <http://localhost:3001/god-mode/>，注册为实例管理员。
2. 打开 <http://localhost:3000>，用同一账号登录。

服务的默认端口：

| 服务            | 地址                    |
| --------------- | ----------------------- |
| Web 应用        | <http://localhost:3000> |
| 管理后台        | <http://localhost:3001> |
| Space（分享页） | <http://localhost:3002> |
| Django API      | <http://localhost:8000> |
| MinIO 控制台    | <http://localhost:9090> |

> Windows 上请在 Git Bash 中执行 `setup.sh`，或直接使用下一节的原生脚本。

## 本地开发（Windows，不使用 Docker）

[`local-dev.ps1`](./local-dev.ps1) 会在本机拉起一套独立的开发环境：私有 PostgreSQL 集群（`.local/pgdata`，端口 `55432`）、Django API 和前端应用。它不会碰你已有的 PostgreSQL 服务。

前置条件：

- Node.js 22.22.0+，并执行过 `corepack enable pnpm`
- Python 3.12 与 [uv](https://docs.astral.sh/uv/) 0.12.21
- PostgreSQL 15+ 的 `initdb.exe`、`pg_ctl.exe`（在 PATH 或 `C:\Program Files\PostgreSQL\<version>\bin` 下）

```powershell
# 启动（数据库 + API + web/admin/space）
.\local-dev.ps1

# 查看状态、停止全部进程
.\local-dev.ps1 -Status
.\local-dev.ps1 -Stop

# 其他常用参数
.\local-dev.ps1 -ResetDb                      # 删除并重建本地数据库
.\local-dev.ps1 -SkipApi                      # 只启动前端
.\local-dev.ps1 -SkipFrontend                 # 只启动数据库和 API
.\local-dev.ps1 -Apps web,admin,space,live    # 指定前端应用（live 需要 Redis）
.\local-dev.ps1 -DatabaseUrl "postgresql://strata:strata@127.0.0.1:5432/strata"
```

说明：

- 日志在 `.local/logs/`，进程号在 `.local/pids/`，本地数据在 `.local/pgdata/`。
- Redis、MinIO 可选：检测到 `redis-server` / `minio` 时自动启动，否则缓存退化为进程内存，附件上传不可用。
- 该模式不使用 RabbitMQ，Celery 使用内存 broker，因此后台任务不会真正执行。需要完整的异步任务时请使用 Docker 方式。

## 常用命令

| 命令                                          | 作用                                     |
| --------------------------------------------- | ---------------------------------------- |
| `pnpm dev`                                    | 启动全部前端开发服务                     |
| `pnpm build`                                  | 构建所有包与应用                         |
| `pnpm start`                                  | 以生产模式启动已构建的应用               |
| `pnpm check`                                  | 运行全部检查（格式、lint、类型）         |
| `pnpm check:lint`                             | 对所有包运行 OxLint                      |
| `pnpm check:types`                            | TypeScript 类型检查                      |
| `pnpm fix`                                    | 自动修复格式与 lint 问题                 |
| `pnpm --filter web test`                      | 运行 web 应用的单元测试（vitest）        |
| `pnpm turbo run <command> --filter=<package>` | 只对某个包或应用执行命令                 |

## 测试

前端单元测试使用 vitest：

```bash
pnpm --filter web test
pnpm --filter @strata/blocks test
```

后端 Django/pytest 测试运行在独立的 Docker 栈中：

```bash
# 首次需要生成 apps/api/.env
./setup.sh

# 全量测试
docker compose -f docker-compose-test.yml up --build --abort-on-container-exit --exit-code-from api-tests

# 只跑某个标记
docker compose -f docker-compose-test.yml run --rm --build api-tests pytest -m unit

# 清理
docker compose -f docker-compose-test.yml down -v
```

更多细节见 [apps/api/tests/RUNNING_TESTS.md](./apps/api/tests/RUNNING_TESTS.md) 和 [apps/api/tests/TESTING_GUIDE.md](./apps/api/tests/TESTING_GUIDE.md)。

## 仓库结构

本仓库是 pnpm + Turborepo 管理的 monorepo，前端与 Django 后端在同一个仓库中。

```text
apps/
  web        主应用（React Router）
  admin      实例管理后台
  space      公开分享页
  live       实时协作服务
  api        Django 后端（apps/api/strata）
  proxy      反向代理配置
packages/
  blocks         复合组件与 Strata 专属组件（@strata/blocks）
  constants      常量与枚举
  editor         ProseMirror 编辑器
  hooks          React Hooks
  i18n           国际化与翻译文件
  logger         日志
  services       API 客户端与服务层
  shared-state   可复用 MobX 状态
  types          TypeScript 类型
  utils          通用工具函数
  codemods       代码迁移脚本
  decorators     TypeScript 装饰器
  tailwind-config / typescript-config   共享配置
```

### 架构概览

- **前端**：React Router 应用，MobX 管理状态，ProseMirror 提供富文本编辑；基础组件来自 `@makestrata/propel`，复合组件放在 `@strata/blocks`。
- **后端**：Django + Django REST Framework，Celery 处理异步任务，Channels 提供 WebSocket 能力。
- **基础设施**：PostgreSQL 存业务数据，Redis 做缓存与消息通道，RabbitMQ 做任务队列，MinIO（S3 兼容）存附件。

## 配置

`setup.sh` 会把根目录和各应用的 `.env.example` 复制为 `.env`，并生成 Django `SECRET_KEY` 与对象存储凭据。常用配置项：

| 变量                                        | 说明                             |
| ------------------------------------------- | -------------------------------- |
| `POSTGRES_*`                                | 数据库连接信息                   |
| `REDIS_HOST` / `REDIS_PORT`                 | Redis 地址                       |
| `RABBITMQ_*`                                | RabbitMQ 连接信息                |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | 对象存储凭据                   |
| `AWS_S3_ENDPOINT_URL` / `AWS_S3_BUCKET_NAME` | S3 端点与存储桶                |
| `SECRET_KEY`                                | Django 密钥（由脚本生成）        |

`.env` 已被 `.gitignore` 忽略，请勿提交任何真实凭据。

## 技术栈

[![React Router](https://img.shields.io/badge/-React%20Router-CA4245?logo=react-router&style=for-the-badge&logoColor=white)](https://reactrouter.com/)
[![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=green)](https://www.djangoproject.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Node.js](https://img.shields.io/badge/node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)

## 文档

- 产品文档：[docs.strata.so](https://docs.strata.so/)
- 开发者文档（安装、部署、实例管理）：[developers.strata.so](https://developers.strata.so/)
- Lint 与格式化约定：[docs/linting.md](./docs/linting.md)
- 贡献指南：[CONTRIBUTING.md](./CONTRIBUTING.md)

## 社区与贡献

欢迎加入 [GitHub Discussions](https://github.com/orgs/makestrata/discussions) 和[论坛](https://forum.strata.so)。所有社区渠道都遵循[行为准则](./CODE_OF_CONDUCT.md)。

参与方式：

- 提交 [bug](https://github.com/makestrata/strata/issues/new) 或功能请求。
- 改进文档，或补充教程与示例。
- 新增集成、更新翻译、修复 issue。
- 给热门功能请求点赞，帮助排优先级。

提交 PR 前请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)，并在本地跑通 `pnpm check`。

## 安全

如果你发现了安全漏洞，请通过负责任的方式私下报告，不要直接开公开 Issue。详见[安全政策](./SECURITY.md)，或发送邮件至 security@strata.so。

## 许可证

本项目基于 [GNU Affero General Public License v3.0](./LICENSE.txt) 发布。

---

<br />

<a id="english"></a>

# Strata

**Modern, open-source project management for all teams.**

Strata brings work items, cycles, modules, views, pages, and analytics into one workspace, so teams can focus on shipping instead of managing the tool.

**Features:** rich work items with file uploads and sub-properties · cycles with burn-down charts · modules for breaking down complex projects · saved and shareable views · AI-assisted pages · real-time analytics.

## Quick start

- **Strata Cloud** — sign up at [app.strata.so](https://app.strata.so).
- **Self-host** — follow the [Docker Compose](https://developers.strata.so/self-hosting/methods/docker-compose) or [Kubernetes](https://developers.strata.so/self-hosting/methods/kubernetes) guide.
- **Local development** — see below.

## Local development

### With Docker

Requirements: Docker Engine, Node.js 22.22.0+, pnpm 11.10.0, and at least 12 GB of RAM.

```bash
git clone https://github.com/makestrata/strata.git
cd strata
chmod +x setup.sh
./setup.sh
docker compose -f docker-compose-local.yml up -d
pnpm dev
```

Open <http://localhost:3001/god-mode/> to register an instance admin, then sign in at <http://localhost:3000>.

Ports: web `3000`, admin `3001`, space `3002`, API `8000`, MinIO console `9090`.

### On Windows without Docker

[`local-dev.ps1`](./local-dev.ps1) starts a private PostgreSQL cluster (`.local/pgdata`, port `55432`), the Django API, and the frontend apps. It requires Node.js 22.22.0+, pnpm, Python 3.12, uv 0.12.21, and PostgreSQL 15+ binaries.

```powershell
.\local-dev.ps1                  # database + API + web/admin/space
.\local-dev.ps1 -Status          # show status
.\local-dev.ps1 -Stop            # stop everything
.\local-dev.ps1 -ResetDb         # recreate the local database
.\local-dev.ps1 -SkipApi         # frontend only
.\local-dev.ps1 -SkipFrontend    # database and API only
```

Redis and MinIO are optional in this mode. RabbitMQ is not used; Celery falls back to an in-memory broker, so background jobs do not run.

## Commands

| Command                | Description                              |
| ---------------------- | ---------------------------------------- |
| `pnpm dev`             | Start all frontend dev servers           |
| `pnpm build`           | Build all packages and apps              |
| `pnpm check`           | Run format, lint, and type checks        |
| `pnpm fix`             | Auto-fix formatting and lint issues      |
| `pnpm --filter web test` | Run web unit tests (vitest)            |

## Testing

```bash
pnpm --filter web test
pnpm --filter @strata/blocks test

# Backend (Docker; run ./setup.sh once first)
docker compose -f docker-compose-test.yml up --build --abort-on-container-exit --exit-code-from api-tests
docker compose -f docker-compose-test.yml run --rm --build api-tests pytest -m unit
docker compose -f docker-compose-test.yml down -v
```

## Repository layout

```text
apps/       web, admin, space, live, api (Django), proxy
packages/   blocks, constants, editor, hooks, i18n, logger, services,
            shared-state, types, utils, codemods, decorators,
            tailwind-config, typescript-config
```

Frontend: React Router, MobX, ProseMirror. Backend: Django REST Framework, Celery, Channels. Infrastructure: PostgreSQL, Redis, RabbitMQ, MinIO.

## Documentation and community

- Product docs: [docs.strata.so](https://docs.strata.so/)
- Developer docs: [developers.strata.so](https://developers.strata.so/)
- Contributing: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Security: [SECURITY.md](./SECURITY.md) · security@strata.so
- Forum: [forum.strata.so](https://forum.strata.so)

## License

[GNU Affero General Public License v3.0](./LICENSE.txt)
