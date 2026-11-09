# Strata 测试指南

本文档说明如何基于 pytest 编写 Strata 的测试。

## 测试分类

测试分为三类：

1. **单元测试（Unit）**：隔离地测试单个组件。
2. **契约测试（Contract）**：测试 API 端点，验证组件之间的契约。
3. **冒烟测试（Smoke）**：针对关键流程的基础端到端测试。

## 编写单元测试

单元测试按被测对象放到 `tests/unit/` 下对应目录：

- `tests/unit/models/`：模型测试
- `tests/unit/serializers/`：序列化器测试
- `tests/unit/utils/`：工具函数测试

### 示例

```python
import pytest
from strata.api.serializers import MySerializer

@pytest.mark.unit
class TestMySerializer:
    def test_serializer_valid_data(self):
        # 构造输入
        data = {"field1": "value1", "field2": 42}

        # 初始化序列化器
        serializer = MySerializer(data=data)

        # 校验
        assert serializer.is_valid()

        # 检查校验后的数据
        assert serializer.validated_data["field1"] == "value1"
        assert serializer.validated_data["field2"] == 42
```

## 编写契约测试

契约测试放在 `tests/contract/api/` 或 `tests/contract/app/`，用于测试 API 端点。

### 示例

```python
import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.contract
class TestMyEndpoint:
    @pytest.mark.django_db
    def test_my_endpoint_get(self, auth_client):
        # 获取 URL
        url = reverse("my-endpoint")

        # 发起请求
        response = auth_client.get(url)

        # 检查响应
        assert response.status_code == status.HTTP_200_OK
        assert "data" in response.data
```

## 编写冒烟测试

冒烟测试放在 `tests/smoke/`，使用 `strata_server` fixture 针对真实 HTTP 服务测试。

### 示例

```python
import pytest
import requests

@pytest.mark.smoke
class TestCriticalFlow:
    @pytest.mark.django_db
    def test_login_flow(self, strata_server, create_user, user_data):
        # 登录地址
        url = f"{strata_server.url}/api/auth/signin/"

        # 测试登录
        response = requests.post(
            url,
            json={
                "email": user_data["email"],
                "password": user_data["password"]
            }
        )

        # 校验
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
```

## 常用 Fixtures

测试环境提供了这些 fixture：

1. `api_client`：未认证的 DRF APIClient
2. `api_key_client`：带 API Key 认证的客户端（外部 API 测试）
3. `session_client`：带 session 认证的客户端（Web App API 测试）
4. `create_user`：创建并返回测试用户
5. `mock_redis`：mock Redis 交互
6. `mock_elasticsearch`：mock Elasticsearch 交互
7. `mock_celery`：mock Celery 任务执行

## 使用 Factory Boy

复杂测试数据用现成的 factory：

```python
from strata.tests.factories import UserFactory, WorkspaceFactory

# 创建用户
user = UserFactory()

# 创建指定 owner 的工作区
workspace = WorkspaceFactory(owner=user)

# 批量创建
users = UserFactory.create_batch(5)
```

## 运行测试

```bash
# 全部测试
python -m pytest

# 只跑单元测试并统计覆盖率
python -m pytest -m unit --cov=strata
```

## 最佳实践

1. **测试小而聚焦**：每个用例验证一个具体行为。
2. **使用 marker**：始终加上对应的 marker（`@pytest.mark.unit` 等）。
3. **mock 外部依赖**：使用提供的 mock fixture。
4. **使用 factory**：复杂数据用 factory 构造。
5. **不要测试框架本身**：专注于业务逻辑，而不是 Django/DRF 的内建能力。
6. **断言要可读**：使用原生 `assert`，必要时给出清晰的失败信息。
7. **关注覆盖率**：关键组件目标 ≥90%。
