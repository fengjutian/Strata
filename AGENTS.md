# 开发指南（面向 AI 编码代理与人类贡献者）

**简体中文** · [English](#agent-development-guide)

## 常用命令

| 命令                                          | 作用                                     |
| --------------------------------------------- | ---------------------------------------- |
| `pnpm dev`                                    | 启动全部开发服务（web:3000、admin:3001） |
| `pnpm build`                                  | 构建所有包与应用                         |
| `pnpm check`                                  | 跑全部检查（格式、lint、类型）           |
| `pnpm check:lint`                             | 对所有包跑 OxLint                        |
| `pnpm check:types`                            | TypeScript 类型检查                      |
| `pnpm fix`                                    | 自动修复格式与 lint 问题                 |
| `pnpm --filter web test`                      | 跑 web 应用的单元测试（vitest）          |
| `pnpm turbo run <command> --filter=<package>` | 只针对某个包/应用执行                    |
| `.\local-dev.cmd`                             | 无 Docker 本地启动全套环境（Windows）    |

## 仓库结构

```
apps/
  web      主应用（React Router）
  admin    实例管理后台
  space    公开分享页
  live     实时协作
  api      Django 后端（apps/api/strata）
  proxy    反向代理配置
packages/
  blocks       复合组件（@strata/blocks，仅子路径导入）
  constants    常量与枚举
  editor       ProseMirror 编辑器
  hooks  i18n  logger  services  shared-state
  types  utils  codemods  decorators
  tailwind-config  typescript-config
```

## 代码风格

- **导入**：内部包用 `workspace:*`，外部依赖用 `catalog:`
- **TypeScript**：开启严格模式，所有文件必须有类型
- **格式化**：oxfmt，执行 `pnpm fix:format`
- **Lint**：OxLint，共用 `.oxlintrc.json`
- **命名**：变量/函数用 camelCase，组件/类型用 PascalCase
- **错误处理**：使用 try-catch 并带上正确的错误类型，按需记录日志
- **状态管理**：MobX store。主要业务 store 位于 `apps/web/store`，可复用的状态放在 `packages/shared-state`；store 之间通过继承/组合拆分职责，避免单文件巨型 store
- **测试**：所有功能都需要单元测试，按包使用已有的测试框架（`apps/web` 用 vitest，`packages/blocks` 用 vitest，后端用 pytest）
- **组件**：基础组件来自已发布的 `@makestrata/propel`（`@makestrata/propel/components/*`、`elements/*`、`icons`）；复合组件与 Strata 专属组件放在 `@strata/blocks`（`packages/blocks`，只允许子路径导入，如 `@strata/blocks/toast`）

## 后端依赖（uv）

`apps/api` 的依赖用 [uv](https://docs.astral.sh/uv/) 管理：声明在 `apps/api/pyproject.toml`，锁定在 `apps/api/uv.lock`（两者都要提交）。依赖组：`dev` 与 `test`（默认安装，使用 `psycopg-binary`）、`production`（gunicorn + 源码构建的 `psycopg-c`，仅生产镜像与 migration-check 使用）。lint 配置见 `apps/api/ruff.toml`。

- uv 版本必须与 `apps/api/pyproject.toml` 里的 `required-version` 完全一致（`uv self update <version>`）；升级时要同步两个 Dockerfile 里的 uv 镜像
- 本地建环境：`cd apps/api && uv sync`
- 在 dev/test 容器里务必加 `--inexact`（`uv sync --inexact`）：uv 指向镜像的系统 Python，精确同步会把 pip 卸掉
- 新增/升级依赖：`uv add <pkg>==<version>`（或加 `--group test` / `--group dev`），或改 `pyproject.toml` 后执行 `uv lock`
- 执行工具：`uv run python manage.py ...`、`uv run ruff check .`

## 后端测试（Docker）

`apps/api` 的 Django/pytest 测试跑在仓库根目录 `docker-compose-test.yml` 定义的独立栈里。

前置（只需一次）：`./setup.sh` —— 从 `.env.example` 生成 `apps/api/.env`。

- 全量：`docker compose -f docker-compose-test.yml up --build --abort-on-container-exit --exit-code-from api-tests`
- 子集：`docker compose -f docker-compose-test.yml run --rm --build api-tests pytest -m unit`
- 清理：`docker compose -f docker-compose-test.yml down -v`

完整步骤与排错见 `apps/api/tests/RUNNING_TESTS.md`，测试约定与 fixture 见 `apps/api/tests/TESTING_GUIDE.md`。

---

<br />

<a id="agent-development-guide"></a>

# Agent Development Guide

## Commands

- `pnpm dev` - Start all dev servers (web:3000, admin:3001)
- `pnpm build` - Build all packages and apps
- `pnpm check` - Run all checks (format, lint, types)
- `pnpm check:lint` - OxLint across all packages
- `pnpm check:types` - TypeScript type checking
- `pnpm fix` - Auto-fix format and lint issues
- `pnpm --filter web test` - Run the web unit tests (vitest)
- `pnpm turbo run <command> --filter=<package>` - Target specific package/app
- `.\local-dev.cmd` - Start the full stack without Docker (Windows)

## Repository layout

```
apps/       web, admin, space, live, api (Django), proxy
packages/   blocks, constants, editor, hooks, i18n, logger, services,
            shared-state, types, utils, codemods, decorators,
            tailwind-config, typescript-config
```

## Code Style

- **Imports**: Use `workspace:*` for internal packages, `catalog:` for external deps
- **TypeScript**: Strict mode enabled, all files must be typed
- **Formatting**: oxfmt, run `pnpm fix:format`
- **Linting**: OxLint with shared `.oxlintrc.json` config
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Error Handling**: Use try-catch with proper error types, log errors appropriately
- **State Management**: MobX stores. Feature stores live in `apps/web/store`; reusable state lives in `packages/shared-state`. Split responsibilities into layered stores instead of one giant store file
- **Testing**: All features require unit tests, use the existing test framework per package (vitest in `apps/web` and `packages/blocks`, pytest in `apps/api`)
- **Components**: Primitives come from the published `@makestrata/propel` npm package (`@makestrata/propel/components/*`, `elements/*`, `icons`); composite/Strata-specific components live in `@strata/blocks` (`packages/blocks`, subpath imports only, e.g. `@strata/blocks/toast`)

## Backend dependencies (uv)

`apps/api` dependencies are managed with [uv](https://docs.astral.sh/uv/): declared in `apps/api/pyproject.toml`, pinned in `apps/api/uv.lock` (commit both). Groups: `dev` and `test` (installed by default; they use `psycopg-binary`), `production` (gunicorn + the source-built `psycopg-c`; production image and migration-check only). Lint config lives in `apps/api/ruff.toml`.

- uv must be exactly the `required-version` in `apps/api/pyproject.toml` (`uv self update <version>`); bump it together with the uv image in both Dockerfiles
- Set up a local env: `cd apps/api && uv sync`
- Inside the dev/test containers, always pass `--inexact` (`uv sync --inexact`): uv targets the image's system Python there, and an exact sync would uninstall pip
- Add/upgrade a dependency: `uv add <pkg>==<version>` (or `--group test`/`--group dev`), or edit `pyproject.toml` and run `uv lock`
- Run tools: `uv run python manage.py ...`, `uv run ruff check .`

## Backend tests (Docker)

The Django/pytest suite for `apps/api` runs in an isolated stack defined by `docker-compose-test.yml` at the repo root.

Prereq (once): `./setup.sh` — generates `apps/api/.env` from `.env.example`.

- Full suite: `docker compose -f docker-compose-test.yml up --build --abort-on-container-exit --exit-code-from api-tests`
- Subset: `docker compose -f docker-compose-test.yml run --rm --build api-tests pytest -m unit`
- Teardown: `docker compose -f docker-compose-test.yml down -v`

See `apps/api/tests/RUNNING_TESTS.md` for the full walkthrough and troubleshooting; see `apps/api/tests/TESTING_GUIDE.md` for test conventions and fixtures.
