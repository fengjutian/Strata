# Strata 测试

本目录是 Strata 的测试代码，使用 pytest 组织。

## 测试结构

测试分为以下几类：

- **单元测试（Unit）**：隔离地测试单个函数或类。
- **契约测试（Contract）**：测试组件之间的交互，验证 API 契约是否被满足。
  - **API 测试**：测试对外 API 端点（位于 `/api/v1/`）。
  - **App 测试**：测试 Web 应用 API 端点（位于 `/api/`）。
- **冒烟测试（Smoke）**：验证应用能正常启动的基础测试。

## 外部 API 与 App API

Strata 有两类 API 端点：

1. **外部 API**（`strata.api`）：
   - 路径前缀 `/api/v1/`
   - 使用 API Key 认证（`X-Api-Key` 请求头）
   - 面向前向兼容的对外契约与第三方接入
   - 测试使用 `api_key_client` fixture 认证
   - 测试文件位于 `contract/api/`

2. **Web App API**（`strata.app`）：
   - 路径前缀 `/api/`
   - 使用基于 session 的认证（关闭 CSRF）
   - 服务于前端应用
   - 测试使用 `session_client` fixture 认证
   - 测试文件位于 `contract/app/`

## 运行测试

运行全部测试：

```bash
python -m pytest
```

按类别运行：

```bash
# 单元测试
python -m pytest strata/tests/unit/

# API 契约测试
python -m pytest strata/tests/contract/api/

# App 契约测试
python -m pytest strata/tests/contract/app/

# 冒烟测试
python -m pytest strata/tests/smoke/
```

也提供了便捷脚本：

```bash
# 全部测试
./run_tests.py

# 只跑单元测试
./run_tests.py -u

# 契约测试 + 覆盖率报告
./run_tests.py -c -o

# 并行执行
./run_tests.py -p
```

## Fixtures

可用的测试 fixture：

- `api_client`：未认证的 API 客户端
- `create_user`：创建测试用户
- `api_token`：测试用户的 API token
- `api_key_client`：带 API Key 认证的客户端（外部 API 测试）
- `session_client`：带 session 认证的客户端（App API 测试）
- `strata_server`：真实运行的 Django 测试服务器（基于 HTTP 的冒烟测试）

## 编写测试

编写测试时遵循：

1. 按测试类型放到对应目录。
2. 按被测 API 选择客户端 fixture：
   - 外部 API（`/api/v1/`）用 `api_key_client`
   - Web App API（`/api/`）用 `session_client`
   - 需要真实 HTTP 的冒烟测试用 `strata_server`
3. 反向解析 URL 时使用正确的命名空间：
   - 外部 API：`reverse("api:endpoint_name")`
   - Web App API：`reverse("endpoint_name")`
4. 访问数据库的测试加 `@pytest.mark.django_db`。
5. 加上合适的 marker（`@pytest.mark.contract` 等）对测试分类。

## 测试 fixture 的位置

- `conftest.py`：认证、数据库访问等通用 fixture
- `conftest_external.py`：外部服务（Redis、Elasticsearch、Celery）的 fixture
- `factories.py`：用于快速创建模型实例的测试工厂

## 最佳实践

1. **使用 pytest 的 assert 语法**，不要用 Django 的 `self.assert*`。
2. **用 marker 分类**：

   ```python
   @pytest.mark.unit
   @pytest.mark.contract
   @pytest.mark.smoke
   ```

3. **用 fixture 代替 setUp/tearDown**，代码更干净、更易复用。
4. **用提供的 fixture mock 外部依赖**，避免测试依赖外部服务。
5. **测试要聚焦**，每个用例验证一个具体行为或边界。
6. **文件保持小而有序**，按逻辑组件或端点组织。
7. **模型、序列化器与业务逻辑的覆盖率目标 90%**。

## 外部依赖

涉及外部服务的组件测试应：

1. 单元测试与大部分契约测试使用 `mock_redis`、`mock_elasticsearch`、`mock_celery` fixture。
2. 更完整的契约测试可选使用基于 Docker 的测试容器。

## 覆盖率报告

```bash
python -m pytest --cov=strata --cov-report=term --cov-report=html
```

会在 `htmlcov/` 目录生成 HTML 报告。

## 旧测试迁移

`api/` 目录下仍有少量旧格式测试，需要陆续迁移到新的 `contract/` 结构下对应目录。
