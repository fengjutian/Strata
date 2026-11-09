# 运行 API 测试套件

本文档说明如何通过仓库根目录的 `docker-compose-test.yml`，在 Docker 中运行 `apps/api` 的 Django/pytest 测试。该 compose 文件会启动一套隔离的依赖栈——Postgres、Valkey（Redis）、RabbitMQ、MinIO——数据目录使用 tmpfs，因此每次运行都从干净状态开始，一条命令即可全部清理。

测试目录结构、marker 与 fixture 的背景说明见 [`TESTING_GUIDE.md`](../strata/tests/TESTING_GUIDE.md) 与 [`README.md`](../strata/tests/README.md)。

## 前置条件

- Docker 与 Docker Compose v2（`docker compose ...`）
- 已通过安装脚本生成 env 文件：

  ```bash
  ./setup.sh
  ```

  该脚本会把 `apps/api/.env.example` 复制为 `apps/api/.env`（以及其他应用的 env 文件）。compose 文件读取的是 `apps/api/.env`，所以这一步必须在**第一次**执行 `docker compose` 之前完成。

## 运行测试

以下命令都在仓库根目录执行。

### 全量

```bash
docker compose -f docker-compose-test.yml up \
  --build \
  --abort-on-container-exit \
  --exit-code-from api-tests
```

- `--build`：当 `Dockerfile.dev`、`pyproject.toml` 或 `uv.lock` 变化时重建 `api-tests` 镜像。
- `--abort-on-container-exit`：`api-tests` 一退出就停止依赖服务。
- `--exit-code-from api-tests`：把 pytest 的退出码透传出来，便于 CI 使用。

### 过滤运行

用 `docker compose run` 覆盖默认的 `pytest` 命令，服务名之后的参数会原样传给 pytest。

```bash
# 只跑单元测试（marker 定义在 pytest.ini）
docker compose -f docker-compose-test.yml run --rm --build api-tests pytest -m unit

# 指定目录 + 名称过滤
docker compose -f docker-compose-test.yml run --rm --build api-tests \
  pytest strata/tests/unit -k "test_workspace"

# 单个文件 + 详细输出
docker compose -f docker-compose-test.yml run --rm --build api-tests \
  pytest strata/tests/unit/models/test_workspace.py -vv
```

可用的 marker（`unit`、`contract`、`smoke`、`slow`）声明在 `apps/api/pytest.ini`。

### 清理

```bash
docker compose -f docker-compose-test.yml down -v
```

`-v` 会删除临时卷与 `test_env` 网络。数据目录基于 tmpfs，清理后不会在宿主机留下任何状态——每次运行都是干净的。建议在不同测试会话之间执行，释放 Docker 资源。

## 工作原理

| 服务         | 镜像                                                | 作用                           |
| ------------ | --------------------------------------------------- | ------------------------------ |
| `test-db`    | `postgres:15.7-alpine`                              | 应用数据库                     |
| `test-redis` | `valkey/valkey:7.2.11-alpine`                       | 缓存 / Celery broker           |
| `test-mq`    | `rabbitmq:3.13.6-management-alpine`                 | 任务队列                       |
| `test-minio` | `docker.io/pgsty/silo:RELEASE.2026-09-16T00-00-00Z` | S3 兼容对象存储                |
| `api-tests`  | 由 `apps/api/Dockerfile.dev` 构建                   | 按锁文件 `uv sync` 后跑 pytest |

四个依赖都带健康检查，`api-tests` 通过 `depends_on` 等待它们 `service_healthy`，因此 pytest 只会在整套栈就绪后启动。

测试期的环境变量覆盖写在 compose 文件里（`POSTGRES_HOST=test-db`、`REDIS_URL=redis://test-redis:6379/`、`AWS_S3_ENDPOINT_URL=http://test-minio:9000`、`DJANGO_SETTINGS_MODULE=strata.settings.test`），其余继承自 `apps/api/.env`。

## 排错

- **`./apps/api/.env: no such file or directory`** —— 在仓库根目录执行 `./setup.sh`。
- **端口被占用** —— 测试服务都不映射宿主机端口；出现该报错说明是别的 compose 栈占用。先停掉本地栈：`docker compose -f docker-compose-local.yml down`。
- **依赖改动后镜像未更新** —— 显式重建：`docker compose -f docker-compose-test.yml build --no-cache api-tests`。
- **MinIO bucket 不存在** —— `test-minio` 的 entrypoint 会按 `AWS_S3_BUCKET_NAME`（默认 `uploads`）创建 bucket。改 `apps/api/.env` 后重新运行。
- **数据库状态在多次运行间残留** —— 确认执行的是 `down -v` 而不是 `down`。tmpfs 挂载会随容器销毁，但网络与外部创建的卷需要 `-v` 才能清理。
