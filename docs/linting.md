# Strata 的 Lint 机制

整个 monorepo 使用 [OxLint](https://oxc.rs/docs/guide/usage/linter) 做 lint。OxLint 是一个 Rust 单二进制工具，速度比 ESLint 快 50–100 倍，运行时不依赖 Node.js。

## 要点

1. **单一根配置**：仓库根目录的一份 `.oxlintrc.json` 覆盖所有包与应用。
2. **不需要构建产物**：OxLint 不依赖 TypeScript 编译结果，因此 lint 与 build 相互独立。
3. **插件覆盖**：react、typescript、jsx-a11y、import、promise、unicorn、oxc。

## 如何执行

在仓库根目录：

```bash
# 检查 lint 问题
pnpm check:lint

# 自动修复
pnpm fix:lint
```

只 lint 某个包：

```bash
pnpm turbo run check:lint --filter=@strata/blocks
```

## VS Code 集成

安装 [OxLint 扩展](https://marketplace.visualstudio.com/items?itemName=nicolo-ribaudo.vscode-oxlint)，可以在输入时直接看到行内错误与警告。

## 检查范围

配置作用于以下位置的 TypeScript / JavaScript 文件：

- `apps/web`、`apps/admin`、`apps/space`、`apps/live`
- `packages/` 下的所有包

**忽略路径**（见 `.oxlintrc.json` 的 `ignorePatterns`）：

- `.cache/`、`.next/`、`.react-router/`、`.storybook/`、`.turbo/`、`.vite/`
- `build/`、`dist/`、`coverage/`、`storybook-static/`
- `**/public/**`
- 配置文件（`*.config.{js,mjs,cjs,ts}`）

## 规则概览

OxLint 使用分类配置：

| 分类            | 级别 | 作用                       |
| --------------- | ---- | -------------------------- |
| **correctness** | warn | 会导致运行时错误的真实 bug |
| **suspicious**  | warn | 很可能是笔误的代码写法     |
| **perf**        | warn | 性能反模式                 |

额外规则调整：

- `react/react-in-jsx-scope` 关闭（React 17+ 的自动 JSX runtime）
- `react/prop-types` 关闭（由 TypeScript 负责 props 校验）
- `unicorn/filename-case`、`unicorn/no-null` 等噪声较大的规则关闭
- 未使用变量只告警，`_` 前缀的变量会被忽略

注意：`apps/web` 的 `check:lint` 目前带 `--max-warnings` 阈值（用于锁定已有告警数量），新增告警会直接让该命令失败。

## 向后兼容

OxLint 支持 `eslint-disable` 注释，仓库里已有的行内压制继续有效。

## 压制告警

```typescript
// 单行
// eslint-disable-next-line no-unused-vars
const data = response;

// 区块
/* eslint-disable no-unused-vars */
// ... code
/* eslint-enable no-unused-vars */
```

**请谨慎使用**——大多数告警都指向应当修复的真实问题。

## 提交前钩子

Husky 会在提交时自动执行 lint-staged：

- 对暂存的 `js/jsx/ts/tsx/cjs/mjs/cts/mts/json/css/md` 文件执行 `oxfmt`
- 对暂存的 `js/jsx/ts/tsx/cjs/mjs/cts/mts` 文件执行 `oxlint --fix --deny-warnings`

如果因为 lint 报错导致提交失败，请先修复再提交。

## 参考文件

- [.oxlintrc.json](../.oxlintrc.json)：OxLint 配置
- [.oxfmtrc.json](../.oxfmtrc.json)：oxfmt 配置
- [package.json](../package.json)：可用脚本
