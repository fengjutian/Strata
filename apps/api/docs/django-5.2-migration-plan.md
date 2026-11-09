# Django 4.2 → 5.2 迁移计划（`apps/api`）

> **状态：** ✅ 已在 `chore/django-5.2-upgrade` 分支执行并验证 · **目标：** 从 **4.2.30 LTS** 升级到 **Django 5.2.15 LTS**
> **范围：** `apps/api`（monorepo 中唯一的 Django 服务） · **策略：** 单个 PR 统筹，直接从 4.2 跳到 5.2 · **依赖策略：** 机会式升级（取最新稳定版，风险处做有依据的覆盖）

---

## 1. 结论摘要

我们对 Strata API 做了端到端审计，覆盖 Django 5.0/5.1/5.2 的所有破坏性变更（12 次定向代码扫描、一次完整 settings 审计、129 个迁移文件扫描，以及逐依赖的兼容性调研）。**应用代码本身已经满足 Django 5.2。** 每一项破坏性变更扫描的结果都是「不受影响」。

因此这次迁移**几乎全部是第三方依赖的协同升级加验证**，而不是重写代码。风险**中低**，且集中在依赖层，而非 Strata 自身代码。

**没有运行时或基础设施阻塞：**

| 前置条件   | Django 5.2 要求    | Strata 现状                      | 状态 |
| ---------- | ------------------ | -------------------------------- | ---- |
| Python     | ≥ 3.10             | 3.12.x（Docker + CI）            | ✅   |
| PostgreSQL | ≥ 14（去掉 PG 13） | 15.7-alpine（所有 compose 文件） | ✅   |
| 数据库驱动 | 首选 psycopg 3     | psycopg 3.3.0                    | ✅   |

**唯一必须的应用层改动**是提升依赖版本号。其余（settings、模型、迁移、中间件、模板）都已符合 5.2。

---

## 执行状态——已验证 ✅

在 `chore/django-5.2-upgrade` 分支执行，并在容器化测试栈中验证（`docker-compose-test.yml`：`python:3.12.5-alpine`、Postgres 15.7、Valkey、RabbitMQ、MinIO）。

**验证结果（Django 5.2.15）：**

| 检查项                                        | 结果                                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| `pip install -r requirements/test.txt`        | ✅ 可解析，无冲突                                                      |
| `manage.py check`                             | ✅ “System check identified no issues”                                 |
| `manage.py makemigrations --check --dry-run`  | ✅ 无变更（在仅改状态的 `0122` 迁移之后）                              |
| `manage.py migrate`（Postgres 15 上完整历史） | ✅ `0001`→`0122`、`django_celery_beat`、`license`、`sessions` 全部应用 |
| `pytest`（全量）                              | ✅ **393 passed, 0 failed**                                            |
| `drf-spectacular` schema 生成（0.29）         | ✅ 可生成（1.58 万行）；仅有原先就存在的 `operationId` 冲突告警        |

**除依赖版本外实际做的改动（均由验证发现）：**

1. **`strata/urls.py`** —— 把 debug-toolbar 的 URL include 改为仅在 `apps.is_installed("debug_toolbar")` 时执行。django-debug-toolbar **6.0** 引入了一个真实模型（`HistoryEntry`）；在测试 settings 下（`DEBUG=True`、该 app 未安装），无条件 `include(debug_toolbar.urls)` 会让 `manage.py check` 抛 `RuntimeError`。加守卫后在所有环境都正确（本地包含，测试/生产跳过）。
2. **`strata/db/migrations/0122_alter_draftissue_assignees_alter_issue_assignees_and_more.py`** —— 针对三个使用 `through=`/`through_fields=` 的 `ManyToManyField`（`issue.assignees`、`draftissue.assignees`、`module.members`）的**仅改状态**的 `AlterField`。Django 5.1 规范了 M2M `through_fields` 的反构造方式。`sqlmigrate` 确认这三个操作**全部是 `(no-op)`**——零 DDL、零数据库影响，只是为了 CI 里的 `makemigrations --check` 保持绿色。
3. **`strata/tests/contract/app/test_authentication.py`** —— 增加模块级 autouse 的 `cache.clear()` fixture（与已有的 per-class `_clear_state` 一致）。这修掉了 **8 个与本次升级无关的既有失败**——在 `preview` 基线（Django 4.2.30）上跑同一文件同样得到 **8 failed, 18 passed**。根因是按 IP 的 `AuthenticationThrottle`（`10/minute`）把请求历史存在共享缓存中，而 `TestMagicSignIn`/`TestMagicSignUp` 之间没有重置。

**未采用（相对原计划调整）：** `FORMS_URLFIELD_ASSUME_HTTPS` —— 在 Django 5.2 中这个过渡期设置自身会触发 `RemovedInDjango60Warning`，而代码里没有 `forms.URLField` 需要静默，加了只是噪音，已回退。

---

## 2. 当前状态

- **服务：** `apps/api` —— Django + DRF + Celery（worker/beat）+ Channels（仅 ASGI http）。仓库中没有其他 Python/Django 服务。
- **Django：** `4.2.30`（4.2 LTS 最后一行；4.2 约在 2026 年 4 月 EOL，本次升级有时间压力）。
- **依赖文件：** `requirements/base.txt`、`requirements/local.txt`、`requirements/production.txt`、`requirements/test.txt`（纯 pip 版本钉，**没有 lockfile**，直接改）。
- **运行入口：** `bin/docker-entrypoint-{api,worker,beat,migrator}.sh`，四个都要做冒烟验证。
- **测试：** `pytest` + `pytest-django`，settings 模块为 `strata.settings.test`，以 `--reuse-db --nomigrations --strict-markers` 运行。
- **CI：** `pull-request-build-lint-api.yml` **只跑 ruff**，**不跑测试套件**。pytest 必须手动/本地运行，作为迁移门槛。

---

## 3. 审计结果——破坏性变更扫描（全部通过）

对 `strata/` 与 `templates/` 扫描了 Django 5.x 的每一类移除/行为变更，汇总如下：

| #   | 破坏性变更（Django 版本）                                                                               | 结果                        | 证据                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 移除 `DEFAULT_FILE_STORAGE` / `STATICFILES_STORAGE` / `get_storage_class()`（5.1）                      | ✅ 不受影响                 | 已使用 `STORAGES` 字典（`settings/common.py:303-304`）。                                                                                                               |
| 2   | 移除 `Meta.index_together` / `AlterIndexTogether`（5.1）                                                | ✅ 不受影响                 | 模型与 129 个迁移中零匹配；已使用 `Meta.indexes`。                                                                                                                     |
| 3   | 移除 pytz 支持：`USE_DEPRECATED_PYTZ`、`timezone.utc`、`is_dst`（5.0）                                  | ✅ 不受影响                 | 约 30 处 `pytz.*` 全是**第三方库自身的 API**（不受影响），未使用 Django 的 pytz 集成面。                                                                               |
| 4   | 移除 `USE_L10N` 设置（5.0）                                                                             | ✅ 不受影响                 | 未定义。                                                                                                                                                               |
| 5   | 移除 `CICharField` / `CIEmailField` / `CITextField`（5.1）                                              | ✅ 不受影响                 | 未使用；只用了 contrib.postgres 的 `ArrayField` / `ArrayAgg`。                                                                                                         |
| 6   | `format_html()` 无参数调用 / `mark_safe` 变更（5.0）                                                    | ✅ 不受影响                 | 零 `format_html(` / `mark_safe(` 调用（HTML 走模板渲染）。                                                                                                             |
| 7   | 移除 `length_is` 过滤器与遗留模板标签（5.1）                                                            | ✅ 不受影响                 | 13 个（邮件/后台）模板中没有 Django Forms，也没有被移除的标签。                                                                                                        |
| 8   | `Model.save()/delete()` 位置参数改为仅关键字（5.1）                                                     | ✅ 不受影响                 | 自定义 `delete()` 覆写已用关键字传 `using=`/`soft=`。                                                                                                                  |
| 9   | `forms.URLField` 默认协议变更（5.0）                                                                    | ✅ 不受影响                 | 只用 `models.URLField` 与 DRF `serializers.URLField`，没有 `forms.URLField`。                                                                                          |
| 10  | 其他移除的 API（`make_random_password`、`conf.urls.url`、`ugettext`、`is_ajax`、`NullBooleanField` 等） | ✅ 不受影响                 | 零匹配。                                                                                                                                                               |
| 11  | 中间件 / 异步 ORM / ASGI 变更（5.x）                                                                    | ✅ 不受影响                 | 中间件均为新式；`MiddlewareMixin` 仍受支持；没有 `async def` / `database_sync_to_async`；ASGI 仅 http。                                                                |
| 12  | 认证 / postgres 聚合 / `TextChoices`（5.x）                                                             | ✅ 不受影响（1 项可选复核） | `ArrayAgg` 只用 `distinct`/`filter`；`check_password`/`make_password` 用法标准。**可选：** 复核是否有对 `str(TextChoices.MEMBER)` 表示的依赖（5.0 改成了值）——未发现。 |

**Settings 审计（`common.py`、`production.py`、`local.py`、`test.py`、`storage.py`、`redis.py`）：** 已满足 5.x。`STORAGES` 已迁移、`DEFAULT_AUTO_FIELD = BigAutoField` 已设置、`TIME_ZONE='UTC'` + `USE_TZ=True`（zoneinfo）、中间件顺序合法、没有被移除的设置项。

**迁移扫描：** 129 个迁移文件，没有 `index_together`/`AlterIndexTogether`/CI 字段。两个文件中的 `AddIndexConcurrently` 在 5.2 下是合法用法（`atomic=False`）。**历史迁移在 5.2 上可正常执行。**

---

## 4. 应用代码改动

### 4.1 必需（已完成，见上文「执行状态」）

- `strata/urls.py` 的 debug-toolbar include 守卫（django-debug-toolbar 6.0 的模型要求）。
- `strata/db/migrations/0122_…` 的仅改状态 M2M `AlterField`（Django 5.1 `through_fields` 规范化，无 DDL）。
- `strata/tests/contract/app/test_authentication.py` 的 autouse 缓存重置 fixture（修掉 8 个既有限流失败，让测试全绿）。

### 4.2 可选 / 未采用

1. ~~**`FORMS_URLFIELD_ASSUME_HTTPS = True`**~~ —— **未采用。** 在 Django 5.2 中该过渡设置自身会触发 `RemovedInDjango60Warning`，且没有 `forms.URLField` 需要静默，只会增加噪音。
2. **`STORAGES` 写法合并** —— `common.py:303-304` 分两条语句定义 `STORAGES`，可合并为一个字面量（功能等价）：
   ```python
   STORAGES = {
       "default": {"BACKEND": "strata.settings.storage.S3Storage"},
       "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
   }
   ```
3. **`strata/asgi.py` 清理（既有隐患，与 5.2 无关）** —— `django_asgi_app = get_asgi_application()` 赋值后未使用，`ProtocolTypeRouter` 里又调用了一次 `get_asgi_application()`，且 `os.environ.setdefault("DJANGO_SETTINGS_MODULE", …)` 位于第一次调用之后（因此无效）。把 `setdefault` 提到顶部并复用 `django_asgi_app` 即可。可选，可在此处或单独清理。

---

## 5. 依赖升级矩阵——**真正的工作量**

策略：**取最新稳定版**，在「最新版」存在可规避风险处做**有依据的覆盖**（表格中加粗标注）。「Min for 5.2」是官方支持 Django 5.2 的最低版本（最新稳定版翻车时的回退选项）。

### 5.1 必须升级（当前版本与 Django 5.2 不兼容）

| 包                             | 当前   | **目标**                       | Min for 5.2 | 说明 / 风险                                                                                                                                                   |
| ------------------------------ | ------ | ------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Django**                     | 4.2.30 | **5.2.x**（最新 5.2 LTS 补丁） | 5.2.0       | 停在 **5.2 LTS**——**不要**跳到 6.0（非 LTS）。执行时确认最新的 5.2.\* 补丁。                                                                                  |
| djangorestframework            | 3.15.2 | **3.17.1**                     | 3.16.0      | 3.15 只支持到 Django 5.0。验证 `UniqueTogetherValidator`/条件 `UniqueConstraint` 行为（3.16 收紧了 nullable/partial 处理）。                                  |
| channels                       | 4.1.0  | **4.3.2**                      | 4.2.1       | 4.3 要求 `asgiref>=3.9`（自动解析），并把 Daphne 变成可选依赖——Strata 用 uvicorn/gunicorn 提供 ASGI，无影响。                                                 |
| django-cors-headers            | 4.3.1  | **4.9.0**                      | 4.7.0       | 区间内无面向使用方的破坏性变更。验证 `CORS_ALLOWED_ORIGINS`/`CORS_ALLOW_ALL_ORIGINS` 仍能加载。                                                               |
| django-filter                  | 24.2   | **25.2**                       | 25.1        | 25.x 移除了内置 DRF schema 生成（Strata 用 drf-spectacular，无影响）。25.2 要求 Python ≥3.10（当前 3.12）。                                                   |
| django-storages                | 1.14.2 | **1.14.6**                     | 1.14.6      | 未设置时 `url_protocol` 默认变 **HTTPS**（1.14.6）；`config`→`client_config` 弃用。验证 S3 设置与生成 URL 的协议。                                            |
| django-redis                   | 5.4.0  | **7.0.0**                      | 6.0.0       | 7.0 重命名了 zset/hash 辅助参数（Strata 未用）并去掉 Django 5.0（无关）。**验证 redis-py 下限**（`redis==5.0.4`）是否满足 7.0；不满足就钉 **6.0.0**。         |
| django_celery_beat             | 2.6.0  | **2.9.0**                      | 2.8.1       | **跳过 2.8.0**（该版本有回归，2.8.1 修复）。2.9 增加 Django 6.0 支持。                                                                                        |
| django-celery-results          | 2.5.1  | **2.6.0**                      | 2.6.0       | 注意：此处 `django_celery_results` **不在** `INSTALLED_APPS` 中（仅作为打包的 result backend），其 DB 迁移不生效——无需 `migrate` 动作。结果过期时间略有变化。 |
| drf-spectacular                | 0.28.0 | **0.29.0**                     | 0.29.0      | 第一个带 Django 5.2 classifier 的版本。升级后**重新生成并提交 OpenAPI schema**。                                                                              |
| scout-apm                      | 3.1.0  | **3.5.3**                      | 3.5.0       | 增量更新，无使用方破坏性变更。                                                                                                                                |
| django-debug-toolbar _（dev）_ | 4.3.0  | **6.0.0**（不是 7.0.0）        | 5.1.0       | **覆盖：** 7.0 去掉 Django 4.2 并改用 shadow-DOM 渲染（可能破坏自定义面板/CSS）。6.0 覆盖窗口最宽。仅开发环境。                                               |
| pytest-django _（test）_       | 4.5.2  | **4.12.0**                     | 4.11.0      | 4.12 要求 Python ≥3.10（当前 3.12），并增加 Django 6.0 支持。`pytest==9.0.3` 已满足其下限。                                                                   |

### 5.2 已兼容 5.2——机会式补丁升级

| 包                                   | 当前        | **目标**                | 说明                                                                                                                                                           |
| ------------------------------------ | ----------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| psycopg / psycopg-binary / psycopg-c | 3.3.0（×3） | **3.3.4**（×3）         | 三者同步升级（ABI 一致），仅补丁级别。                                                                                                                         |
| whitenoise                           | 6.11.0      | **6.12.0**              | 修复 autorefresh 的安全问题（仅开发环境），无破坏性变更。                                                                                                      |
| celery                               | 5.4.0       | **5.5.3**（不是 5.6.x） | **覆盖：** 5.6 回退了 SQS→urllib3 的改动；5.5.3 是久经考验的分支。Strata 用 Redis broker。会拉入 `kombu>=5.5`。（Celery 不绑定 Django 版本，本身已兼容 5.2。） |
| dj-database-url                      | 2.1.0       | **3.0.1**（谨慎）       | **覆盖：** 3.x 是破坏性大版本（engine 注册表校验、提高 Python 下限）。2.1.0 已能用于 5.2——**停在 2.1.0 也可接受**。若升级，验证所有 DB URL scheme 可解析。     |

### 5.3 保持不动（已兼容，升级只增加改动量）

| 包                                                                                              | 当前     | 决定                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| django-crum                                                                                     | 0.7.9    | **保持**——已是最新（无人维护），只依赖稳定的中间件 API。                                                                                                                            |
| opentelemetry-\*（api/sdk/exporter-otlp/-proto-grpc = 1.28.1，instrumentation-django = 0.49b1） | 配套版本 | **整套保持。** 已兼容 5.2，且这些版本互相锁定——升一个就要五个一起升（api/sdk/exporter → `~1.43.x`，instrumentation → `0.64b0`）。应作为**独立、自洽的 chore**，不要混在本次迁移里。 |
| pytz                                                                                            | 2024.1   | **保持**——在 5.2 上仍是有效库。移除它（改用标准库 `zoneinfo`）是单独的可选清理（见 §10）。                                                                                          |
| 非 Django 依赖（boto3、openai、slack-sdk、lxml 等）                                             | —        | 本 PR **不做**——保持改动聚焦于 Django 升级。                                                                                                                                        |

> **关于 `redis`（redis-py 5.0.4）：** 安装时确认满足 `django-redis==7.0.0` 的下限；否则回退到 `django-redis==6.0.0`（与 redis-py 5.x 兼容）。

---

## 6. 分步执行计划

> 单个 PR。把「弃用告警审计」并入测试阶段（把原先「先在 4.2 上跑」的安全网并进 5.2 验证）。

1. **建分支。** 从 `preview` 拉 `chore/<work-item-id>-django-5.2-upgrade`，把本文档一并提交。
2. **修改 `requirements/base.txt`**，按 §5.1 + §5.2（Django、DRF、channels、cors-headers、filter、storages、redis、celery-beat、celery-results、drf-spectacular、scout-apm、psycopg ×3、whitenoise、celery、dj-database-url）。OTel 套件、django-crum、pytz 保持不动。
3. **修改 `requirements/local.txt`** → `django-debug-toolbar==6.0.0`。
4. **修改 `requirements/test.txt`** → `pytest-django==4.12.0`。
5. **（可选）** 应用 §4.2 的加固项（`FORMS_URLFIELD_ASSUME_HTTPS`、`STORAGES` 合并、`asgi.py` 清理）。
6. **干净安装**（全新 venv 或重建镜像）：`pip install -r requirements/test.txt`（会带上 base+test）。在此解决 pip 冲突（尤其 redis-py ↔ django-redis、asgiref ↔ channels、kombu ↔ celery）。
7. **模型状态检查：** `python manage.py makemigrations --check --dry-run` → 预期**没有新迁移**。如果 Django 5.x 要求迁移，先审查再提交。
8. **应用第三方迁移：** 在临时库上 `python manage.py migrate`（django_celery_results 2.6.0 与 django_celery_beat 自带迁移）。
9. **弃用告警审计：** 把警告当作错误跑测试，捕获 `RemovedInDjango60Warning` / `RemovedInDjango61Warning`：
   `python -W error::DeprecationWarning -W error::PendingDeprecationWarning -m pytest`（或通过 `pytest.ini` 的 `filterwarnings`）。逐个甄别（按审计预期应为空）。
10. **全量测试：** `cd apps/api && ./run_tests.sh`（或 `pytest`）。全绿才算过关。
11. **重新生成 OpenAPI schema**（drf-spectacular 0.29.0）并提交 diff：`python manage.py spectacular --file <仓库已有 schema 路径>`（与仓库现有命令保持一致）。审查是否有意外变更。
12. **手动冒烟**每个入口（对着本地栈 `docker-compose-local.yml`）：**api**（启动 + 若干端点，含一条 S3/文件上传路径与一条 webhook）、**worker**（入队并执行任务）、**beat**（调度启动、周期任务触发）、**migrator**（完整跑完）。确认 `check --deploy` 干净：`python manage.py check --deploy`。
13. **更新文档：** 把本计划标记为已执行，记录任何偏差。
14. **提 PR** 到 `preview`，附迁移摘要、测试证据与 schema diff。

---

## 7. 验收标准 / 验证清单

- [ ] `pip install -r requirements/test.txt` 可解析且无冲突。
- [ ] `manage.py makemigrations --check --dry-run` → 无新应用迁移。
- [ ] `manage.py migrate` 干净应用 django_celery_results / django_celery_beat 迁移。
- [ ] `manage.py check --deploy` 通过。
- [ ] 测试套件通过，**且**在 `-W error::DeprecationWarning` 下通过。
- [ ] OpenAPI schema 已重新生成并审查。
- [ ] api / worker / beat / migrator 四个入口都能启动并工作。
- [ ] 构建出的镜像中 `python -c "import django; print(django.VERSION)"` 显示 5.2.x。

---

## 8. 回滚方案

- 本次改动是**pip 版本钉 +（可选）几行设置**，都在一个 PR 里 → 回退该 PR/commit 即可回到 Django 4.2.30。没有破坏性数据迁移：唯一的 schema 变更来自 `django_celery_results`/`django_celery_beat`，都是增量（新索引/字段），即使回滚保留也无害。
- 升级前的 `requirements/*.txt` 通过 git 可恢复，用回退后的依赖重建镜像即可。

---

## 9. 风险与应对

| 风险                                                                      | 可能性                     | 应对                                                                 |
| ------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------- |
| pip 依赖解析冲突（redis-py↔django-redis、asgiref↔channels、kombu↔celery） | 中                         | 在第 6 步的干净环境中解决；必要时回退到 §5.1 的「Min for 5.2」版本。 |
| DRF 3.16+ 的唯一约束校验暴露出原先被静默的错误                            | 低–中                      | 测试套件 + 序列化器测试覆盖；检查创建/更新端点是否新增 400。         |
| django-storages 1.14.6 的 URL 协议变为 HTTPS                              | 低                         | 在 api 冒烟中验证生成的资源 URL；必要时显式设置 `url_protocol`。     |
| drf-spectacular 0.29 的 schema 输出漂移                                   | 低                         | 重新生成并审查提交的 schema diff（第 11 步）。                       |
| 部署时未执行 Celery beat/results 的迁移                                   | 低                         | `migrator` 入口会跑 `migrate`；第 8 步与验收清单再兜底。             |
| 自托管用户使用 PostgreSQL < 14                                            | 低（随附 compose 是 15.7） | 在 release notes/changelog 中注明 PG 14+ 要求。                      |

---

## 10. 不在本次范围 / 后续事项（单独 PR）

- **OpenTelemetry 锁步升级**（api/sdk/exporter → ~1.43.x，instrumentation-django → 0.64b0）——自洽，与 5.2 无关。
- **去掉 pytz，改用标准库 `zoneinfo`** —— 涉及：`strata/utils/timezone_converter.py`、`strata/app/views/cycle/base.py`、`strata/app/views/timezone/base.py`、`strata/api/serializers/cycle.py`、4 个 OAuth provider，以及 `strata/db/models/{project,user,workspace,cycle}.py` 中的 `TIMEZONE_CHOICES`。注意 `pytz.common_timezones` 没有完全等价的 `zoneinfo` 版本，`tz.localize(dt)` 要换成 `dt.replace(tzinfo=ZoneInfo(name))`。
- **dj-database-url 3.x**（破坏性大版本），若本次未做。
- **给 API CI 增加 pytest job** —— 目前 CI 只做 lint，迁移依赖手动跑测试。
- **Django 6.0 准备**（5.2 落地之后）——非 LTS，单独评估。

---

_审计基础：针对 Django 4.2.30 的 `apps/api`，做了 12 次代码扫描 + settings + 迁移 + 19 项逐依赖兼容性检查。执行时请确认最新的 5.2.x 补丁与各包的最新稳定版（上表版本号反映审计时的快照）。_
