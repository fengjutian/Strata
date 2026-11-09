# @strata/logger

基于 [Winston](https://github.com/winstonjs/winston) 的日志与请求日志工具包。日志级别可通过环境变量配置，既支持通用应用日志，也支持结构化的 HTTP 请求日志。

## 特性

- 通过环境变量动态配置日志级别
- 预配置好的通用 logger（`logger`）
- 记录入站请求的请求日志中间件（`requestLogger`）

## 用法

### 作为依赖引入

```json
{
  "dependencies": {
    "@strata/logger": "workspace:*"
  }
}
```

### 导入

```typescript
import { logger, requestLogger } from "@strata/logger";
```

### `logger`：通用日志

```typescript
logger.info("This is an info log");
logger.warn("This is a warning");
logger.error("This is an error");
```

### `requestLogger`：请求日志中间件

```typescript
const app = express();
app.use(requestLogger);
```

## 可用的日志级别

- `error`
- `warn`
- `info`（默认）
- `http`
- `verbose`
- `debug`
- `silly`

## 日志文件

- 日志写在当前工作目录的 `logs` 文件夹中。错误日志文件名格式为 `error-%DATE%.log`，全量日志为 `combined-%DATE%.log`。
- 日志文件按 7 天周期轮转。

## 配置

- 默认日志级别为 `info`。
- 在 `.env` 中设置 `LOG_LEVEL` 即可指定级别。
