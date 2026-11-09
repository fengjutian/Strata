# @strata/decorators

一个轻量的 TypeScript 装饰器库，用声明式写法构建 Express.js 控制器。

## 特性

- TypeScript 优先的设计
- HTTP 方法装饰器（GET、POST、PUT、PATCH、DELETE）
- 支持 WebSocket
- 支持中间件
- 无需构建步骤——直接跑 TypeScript 文件即可

## 安装

本包属于 Strata workspace，在依赖里声明即可使用：

```json
{
  "dependencies": {
    "@strata/decorators": "workspace:*"
  }
}
```

## 用法

### 基础 REST 控制器

```typescript
import { Controller, Get, Post, BaseController } from "@strata/decorators";
import { Router, Request, Response } from "express";

@Controller("/api/users")
class UserController extends BaseController {
  @Get("/")
  async getUsers(req: Request, res: Response) {
    return res.json({ users: [] });
  }

  @Post("/")
  async createUser(req: Request, res: Response) {
    return res.json({ success: true });
  }
}

// 注册路由
const router = Router();
const userController = new UserController();
userController.registerRoutes(router);
```

### WebSocket 控制器

```typescript
import { Controller, WebSocket, BaseWebSocketController } from "@strata/decorators";
import { Request } from "express";
import { WebSocket as WS } from "ws";

@Controller("/ws/chat")
class ChatController extends BaseWebSocketController {
  @WebSocket("/")
  handleConnection(ws: WS, req: Request) {
    ws.on("message", (message) => {
      ws.send(`Received: ${message}`);
    });
  }
}

// 注册 WebSocket 路由
const router = require("express-ws")(app).router;
const chatController = new ChatController();
chatController.registerWebSocketRoutes(router);
```

## API 参考

### 装饰器

- `@Controller(baseRoute: string)`：类装饰器，定义基础路由
- `@Get(route: string)`：HTTP GET 端点
- `@Post(route: string)`：HTTP POST 端点
- `@Put(route: string)`：HTTP PUT 端点
- `@Patch(route: string)`：HTTP PATCH 端点
- `@Delete(route: string)`：HTTP DELETE 端点
- `@WebSocket(route: string)`：WebSocket 端点
- `@Middleware(middleware: RequestHandler)`：为该端点挂中间件

### 基类

- `BaseController`：REST 控制器基类
- `BaseWebSocketController`：WebSocket 控制器基类

## 许可证

本项目基于 [GNU Affero General Public License v3.0](https://github.com/makestrata/strata/blob/master/LICENSE.txt) 发布。
