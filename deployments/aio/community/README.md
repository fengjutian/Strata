# Strata Community 一体化（AIO）Docker 镜像

Strata Community 一体化镜像把全部 Strata 服务打包进单个容器，便于部署与试用。镜像内包含 Web 界面、API 服务、后台 worker、live 服务等。

## 包含的服务

- **Web App**（端口 3001）：Strata 主界面
- **Space**（端口 3002）：公开项目空间
- **Admin**（端口 3003）：管理后台
- **API Server**（端口 3004）：后端 API
- **Live Server**（端口 3005）：实时协作
- **Proxy**（端口 80、443）：Caddy 反向代理
- **Worker & Beat**：后台任务处理

## 前置条件

### 必需的外部服务

AIO 镜像依赖以下外部服务：

- **PostgreSQL**：数据存储
- **Redis**：缓存与会话管理
- **RabbitMQ**：消息队列
- **S3 兼容存储**：文件上传（AWS S3 或 MinIO）

### 必需的环境变量

#### 核心配置

- `DOMAIN_NAME`：你的域名或 IP
- `DATABASE_URL`：PostgreSQL 连接串
- `REDIS_URL`：Redis 连接串
- `AMQP_URL`：RabbitMQ 连接串

#### 存储配置

- `AWS_REGION`：AWS 区域（如 `us-east-1`）
- `AWS_ACCESS_KEY_ID`：S3 access key
- `AWS_SECRET_ACCESS_KEY`：S3 secret key
- `AWS_S3_BUCKET_NAME`：S3 bucket 名
- `AWS_S3_ENDPOINT_URL`：S3 端点（可选，默认使用 AWS）

## 快速开始

### 基本用法

```bash
docker run --name strata-aio --rm -it \
    -p 80:80 \
    -e DOMAIN_NAME=your-domain.com \
    -e DATABASE_URL=postgresql://user:pass@host:port/database \
    -e REDIS_URL=redis://host:port \
    -e AMQP_URL=amqp://user:pass@host:port/vhost \
    -e AWS_REGION=us-east-1 \
    -e AWS_ACCESS_KEY_ID=your-access-key \
    -e AWS_SECRET_ACCESS_KEY=your-secret-key \
    -e AWS_S3_BUCKET_NAME=your-bucket \
    -e SECRET_KEY=your-unique-secret-key \
    -e LIVE_SERVER_SECRET_KEY=your-unique-live-server-secret \
    makestrata/strata-aio-community:latest
```

### 使用 IP 地址的示例

```bash
MYIP=192.168.68.169
docker run --name myaio --rm -it \
    -p 80:80 \
    -e DOMAIN_NAME=${MYIP} \
    -e DATABASE_URL=postgresql://strata:strata@${MYIP}:15432/strata \
    -e REDIS_URL=redis://${MYIP}:16379 \
    -e AMQP_URL=amqp://strata:strata@${MYIP}:15673/strata \
    -e AWS_REGION=us-east-1 \
    -e AWS_ACCESS_KEY_ID=5MV45J9NF5TEFZWYCRAX \
    -e AWS_SECRET_ACCESS_KEY=7xMqAiAHsf2UUjMH+EwICXlyJL9TO30m8leEaDsL \
    -e AWS_S3_BUCKET_NAME=strata-app \
    -e AWS_S3_ENDPOINT_URL=http://${MYIP}:19000 \
    -e FILE_SIZE_LIMIT=10485760 \
    makestrata/strata-aio-community:latest
```

## 配置项

### 可选环境变量

#### 网络与协议

- `SITE_ADDRESS`：服务监听地址（默认 `:80`）

#### 安全与密钥

- `SECRET_KEY`（必需）：Django 密钥。它还用于加密已保存的实例设置，因此重启或重建容器时必须保持一致。没有默认值，也不会自动生成。
- `LIVE_SERVER_SECRET_KEY`（必需）：Live server 密钥。没有默认值，也不会自动生成。

请把两者都设置为唯一且私密的值，可以写在 `strata.env`（`variables.env`）里，也可以作为环境变量传入。任一为空或仍是默认/占位值时，容器会在启动阶段直接退出。

在 v1.4.0 至 v1.4.2 中，未提供 `SECRET_KEY` 的容器会获得一个自动生成的密钥，且每次重建都会变化。升级这类容器时，请从运行中容器的 `/app/strata.env` 读出当前密钥，并以 `SECRET_KEY` 传入。

- `REDIS_SSL_CERT_REQS`：当 `REDIS_URL` 使用 `rediss://` 时，默认会校验 Redis 服务端证书与主机名（`required`）。设为 `none` 可跳过校验。
- `REDIS_SSL_CA_CERTS`：容器内 CA 证书包路径，适用于由私有 CA 签发证书的 Redis。用 `-v` 挂载文件，例如 `-v /path/to/redis-ca.pem:/certs/redis-ca.pem:ro -e REDIS_SSL_CA_CERTS=/certs/redis-ca.pem`。

#### 文件处理

- `FILE_SIZE_LIMIT`：上传文件大小上限，单位字节（默认 `5242880`，即 5MB）

#### API 配置

- `API_KEY_RATE_LIMIT`：API key 限流（默认 `60/minute`）

## 端口映射

对外暴露的端口：

- `80`：主 Web 界面（HTTP）
- `443`：HTTPS（配置了 SSL 时）

## 卷挂载

### 建议持久化的卷

```bash
-v /path/to/logs:/app/logs \
-v /path/to/data:/app/data
```

## 自行构建镜像

```bash
cd deployments/aio/community
IMAGE_NAME=mystrata-aio ./build.sh --release=v0.27.1 [--platform=linux/amd64]
```

可用构建参数：

- `--release`：要构建的 Strata 版本（必需）
- `--image-name`：自定义镜像名（默认 `strata-aio-community`）

## 排错

### 日志

所有服务日志在 `/app/logs/` 下：

- 访问日志：`/app/logs/access/`
- 错误日志：`/app/logs/error/`

### 健康检查

容器内的多个服务由 Supervisor 管理，查看状态：

```bash
docker exec -it <container-name> supervisorctl status
```

### 常见问题

1. **数据库连接失败**：确认 PostgreSQL 可访问且凭据正确。
2. **Redis 连接失败**：确认 Redis 在运行且 URL 正确。
3. **文件上传失败**：检查 S3 凭据与 bucket 权限。

### 环境变量校验

容器启动时会校验必需的环境变量，缺失时会给出明确提示。

## 生产环境建议

- 为 HTTPS 配置正式的 SSL 证书
- 为数据制定备份策略
- 监控资源使用并据此扩容
- 高可用场景使用外部负载均衡
- 定期升级到最新版本
- 妥善保管环境变量与密钥

## 支持

问题与支持请参考 Strata 官方文档。
