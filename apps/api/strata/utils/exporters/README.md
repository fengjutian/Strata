# 📊 Exporters（数据导出）

灵活、可扩展的 Django 模型数据导出工具，支持 CSV、JSON、XLSX 多种格式。

## 🎯 概览

exporters 模块用「schema 描述字段」的方式导出数据，支持：

- **📄 多种格式**：CSV、JSON、XLSX（Excel）
- **🔒 类型安全的字段定义**：StringField、NumberField、DateField、DateTimeField、BooleanField、ListField、JSONField
- **⚡ 自定义转换**：字段级转换与自定义 preparer 方法
- **🔗 点号路径**：方便访问嵌套属性与关联模型
- **🎨 按格式自动处理**：列表在 JSON 中保持数组、在 CSV 中拼接为字符串等

## 🚀 快速开始

### 基础用法

```python
from strata.utils.exporters import Exporter, ExportSchema, StringField, NumberField

# 定义 schema
class UserExportSchema(ExportSchema):
    name = StringField(source="username", label="User Name")
    email = StringField(source="email", label="Email Address")
    posts_count = NumberField(label="Total Posts")

    def prepare_posts_count(self, obj):
        return obj.posts.count()

# 直接传 queryset 即可
users = User.objects.all()
exporter = Exporter(format_type="csv", schema_class=UserExportSchema)
filename, content = exporter.export("users_export", users)
```

### 导出工作项

```python
from strata.utils.exporters import Exporter, IssueExportSchema

# 带上预取的关联数据
issues = Issue.objects.filter(project_id=project_id).prefetch_related(
    'assignee_details',
    'label_details',
    'issue_module',
    # ... 其他关联
)

# 导出为 XLSX —— 直接传 queryset
exporter = Exporter(format_type="xlsx", schema_class=IssueExportSchema)
filename, content = exporter.export("issues", issues)

# 只导出指定字段
exporter = Exporter(format_type="json", schema_class=IssueExportSchema)
filename, content = exporter.export("issues_filtered", issues, fields=["id", "name", "state_name", "assignees"])
```

### 分项目导出多个文件

```python
# 每个项目一个文件
for project_id in project_ids:
    project_issues = issues.filter(project_id=project_id)
    exporter = Exporter(format_type="csv", schema_class=IssueExportSchema)
    filename, content = exporter.export(f"issues-{project_id}", project_issues)
    # 保存或上传文件
```

## 📝 定义 Schema

### 字段类型

#### 📝 StringField

把值转成字符串。

```python
name = StringField(source="name", label="Name", default="N/A")
```

#### 🔢 NumberField

处理数值（int、float）。

```python
count = NumberField(source="items_count", label="Count", default=0)
```

#### 📅 DateField

把日期格式化为 `%a, %d %b %Y`（例如 `Mon, 01 Jan 2024`）。

```python
start_date = DateField(source="start_date", label="Start Date")
```

#### ⏰ DateTimeField

把日期时间格式化为 `%a, %d %b %Y %I:%M:%S %Z%z`。

```python
created_at = DateTimeField(source="created_at", label="Created At")
```

#### ✅ BooleanField

把值转成布尔。

```python
is_active = BooleanField(source="is_active", label="Active", default=False)
```

#### 📋 ListField

处理列表/数组。在 CSV/XLSX 中会用分隔符拼接（默认 `", "`），在 JSON 中保持数组。

```python
tags = ListField(source="tags", label="Tags")
assignees = ListField(label="Assignees")  # 可用 preparer 填充
```

#### 🗂️ JSONField

处理可 JSON 序列化的复杂对象（dict、dict 列表）。在 CSV/XLSX 中序列化为 JSON 字符串，在 JSON 中保持对象。

```python
metadata = JSONField(source="metadata", label="Metadata")
comments = JSONField(label="Comments")
```

### ⚙️ 字段参数

所有字段类型都支持：

- **`source`**：属性路径，支持点号（如 `"project.name"`）
- **`default`**：值为 None 时的默认值
- **`label`**：导出表头中的显示名

### 🔗 点号路径

```python
project_name = StringField(source="project.name", label="Project")
owner_email = StringField(source="created_by.email", label="Owner Email")
```

### 🎯 自定义 preparer

复杂逻辑用 `prepare_{field_name}` 方法：

```python
class MySchema(ExportSchema):
    assignees = ListField(label="Assignees")

    def prepare_assignees(self, obj):
        return [f"{u.first_name} {u.last_name}" for u in obj.assignee_details]
```

preparer 的优先级高于字段定义。

### ⚡ 用 preparer 做自定义转换

```python
class MySchema(ExportSchema):
    name = StringField(source="name", label="Name (Uppercase)")
    status = StringField(label="Status")

    def prepare_name(self, obj):
        """把 name 转成大写。"""
        return obj.name.upper() if obj.name else ""

    def prepare_status(self, obj):
        """根据模型状态计算。"""
        return "Active" if obj.is_active else "Inactive"
```

## 📦 导出格式

### 📊 CSV

- 所有字段使用 `QUOTE_ALL` 加引号
- 列表用 `", "` 拼接（可用 `list_joiner` 自定义）
- JSON 对象序列化为 JSON 字符串
- 扩展名：`.csv`

```python
exporter = Exporter(
    format_type="csv",
    schema_class=MySchema,
    options={"list_joiner": "; "}  # 自定义分隔符
)
```

### 📋 JSON

- 列表保持数组
- 对象保持嵌套结构
- 保留数据类型
- 扩展名：`.json`

```python
exporter = Exporter(format_type="json", schema_class=MySchema)
filename, content = exporter.export("data", records)
# content 是 JSON 字符串：'[{"field": "value"}, ...]'
```

### 📗 XLSX

- 通过 openpyxl 生成 Excel 兼容文件
- 列表用 `", "` 拼接（可用 `list_joiner` 自定义）
- JSON 对象序列化为 JSON 字符串
- 扩展名：`.xlsx`
- 返回二进制内容（bytes）

```python
exporter = Exporter(format_type="xlsx", schema_class=MySchema)
filename, content = exporter.export("data", records)
# content 是 bytes
```

## 🔧 进阶用法

### 📦 用 context 预取数据

把数据通过 context 传给 schema，避免 N+1 查询。在 schema 中覆写 `get_context_data()`：

```python
class MySchema(ExportSchema):
    attachment_count = NumberField(label="Attachments")

    def prepare_attachment_count(self, obj):
        attachments_dict = self.context.get("attachments_dict", {})
        return len(attachments_dict.get(obj.id, []))

    @classmethod
    def get_context_data(cls, queryset):
        """一次查询预取全部附件。"""
        attachments_dict = get_attachments_dict(queryset)
        return {"attachments_dict": attachments_dict}

# Exporter 在序列化时会自动使用 get_context_data()
queryset = MyModel.objects.all()
exporter = Exporter(format_type="csv", schema_class=MySchema)
filename, content = exporter.export("data", queryset)
```

### 🔌 注册自定义格式化器

```python
from strata.utils.exporters import Exporter, BaseFormatter

class XMLFormatter(BaseFormatter):
    def format(self, filename, records, schema_class, options=None):
        # 实现
        return (f"{filename}.xml", xml_content)

# 注册
Exporter.register_formatter("xml", XMLFormatter)

# 使用
exporter = Exporter(format_type="xml", schema_class=MySchema)
```

### ✅ 查看可用格式

```python
formats = Exporter.get_available_formats()
# 返回：['csv', 'json', 'xlsx']
```

### 🔍 过滤字段

传入 `fields` 只导出指定字段：

```python
exporter = Exporter(format_type="csv", schema_class=MySchema)
filename, content = exporter.export(
    "filtered_data",
    queryset,
    fields=["id", "name", "email"]
)
```

### 🎯 扩展 schema

继承已有 schema 并覆写 `get_context_data()`：

```python
class ExtendedIssueExportSchema(IssueExportSchema):
    custom_field = JSONField(label="Custom Data")

    def prepare_custom_field(self, obj):
        # 使用 context 中预取的数据
        return self.context.get("custom_data", {}).get(obj.id, {})

    @classmethod
    def get_context_data(cls, queryset):
        # 先拿父类的 context（附件等）
        context = super().get_context_data(queryset)

        # 加入自己的预取数据
        context["custom_data"] = fetch_custom_data(queryset)

        return context
```

### 💾 手动序列化

如果只需要序列化、不需要导出文件：

```python
# queryset -> dict 列表
data = MySchema.serialize_queryset(queryset, fields=["id", "name"])

# 或序列化单个对象
schema = MySchema()
obj_data = schema.serialize(obj)
```

## 💡 示例：IssueExportSchema

`IssueExportSchema` 是一个完整实现：

```python
from strata.utils.exporters import Exporter, IssueExportSchema

# 直接传 queryset
issues = Issue.objects.filter(project_id=project_id)
exporter = Exporter(format_type="csv", schema_class=IssueExportSchema)
filename, content = exporter.export("issues", issues)

# 只导出指定字段
filename, content = exporter.export(
    "issues_filtered",
    issues,
    fields=["id", "name", "state_name", "assignees", "labels"]
)

# 多个项目分别导出
for project_id in project_ids:
    project_issues = issues.filter(project_id=project_id)
    filename, content = exporter.export(f"issues-{project_id}", project_issues)
    # 逐个保存或上传
```

关键特性：

- 🔗 通过点号路径访问关联模型
- 🎯 复杂字段用 preparer
- 📎 通过 `get_context_data()` 预取附件
- 📋 List 与 JSON 字段处理
- 📅 日期/时间格式化

## ✨ 最佳实践

1. **🚄 避免 N+1 查询**：覆写 `get_context_data()` 预取关联数据：

   ```python
   @classmethod
   def get_context_data(cls, queryset):
       return {
           "attachments": get_attachments_dict(queryset),
           "comments": get_comments_dict(queryset),
       }
   ```

2. **🏷️ 使用 label**：给字段起清晰的 label，导出表头更易读：

   ```python
   created_at = DateTimeField(source="created_at", label="Created At")
   ```

3. **🛡️ 处理 None**：可能为 None 的字段设置默认值：

   ```python
   count = NumberField(source="count", default=0)
   ```

4. **🎯 复杂逻辑放 preparer**：字段定义保持简单：

   ```python
   def prepare_assignees(self, obj):
       return [f"{u.first_name} {u.last_name}" for u in obj.assignee_details]
   ```

5. **⚡ 直接传 QuerySet**：序列化交给 Exporter：

   ```python
   # 推荐
   exporter.export("data", queryset)

   # 尽量避免手动序列化
   data = MySchema.serialize_queryset(queryset)
   exporter.export("data", data)
   ```

6. **📦 过滤 QuerySet，而不是过滤数据**：多次导出时先过滤 queryset：

   ```python
   # 推荐：只序列化需要的数据
   for project_id in project_ids:
       project_issues = issues.filter(project_id=project_id)
       exporter.export(f"project-{project_id}", project_issues)

   # 避免：一次性序列化全部数据
   all_data = MySchema.serialize_queryset(issues)
   for project_id in project_ids:
       project_data = [d for d in all_data if d['project_id'] == project_id]
       exporter.export(f"project-{project_id}", project_data)
   ```

## 📚 API 参考

### 📊 Exporter

**`__init__(format_type, schema_class, options=None)`**

- `format_type`：导出格式（`'csv'`、`'json'`、`'xlsx'`）
- `schema_class`：定义字段的 schema 类
- `options`：格式相关的可选配置字典

**`export(filename, data, fields=None)`**

- `filename`：不带扩展名的文件名
- `data`：Django QuerySet 或 dict 列表
- `fields`：可选，要包含的字段名列表
- 返回：`(带扩展名的文件名, 内容)`
- `content` 在 CSV/JSON 下是 str，XLSX 下是 bytes

**`get_available_formats()`**（类方法）

- 返回：可用格式列表

**`register_formatter(format_type, formatter_class)`**（类方法）

- 注册自定义格式化器

### 📝 ExportSchema

**`__init__(context=None)`**

- `context`：可选字典，在 preparer 中通过 `self.context` 访问预取数据

**`serialize(obj, fields=None)`**

- 返回：单个对象的字段值字典

**`serialize_queryset(queryset, fields=None)`**（类方法）

- `queryset`：要序列化的 QuerySet
- `fields`：可选，要包含的字段名列表
- 返回：序列化后的 dict 列表

**`get_context_data(queryset)`**（类方法）

- 覆写它来为 queryset 预取关联数据
- 返回：context 字典

### 🔧 ExportField

所有字段类型的基类。继承它可自定义字段类型。

**`get_value(obj, context)`**

- 返回：该字段格式化后的值

**`_format_value(raw)`**

- 在子类中覆写，做类型相关的格式化

## 🧪 测试

```python
# 导出 queryset
queryset = MyModel.objects.all()
exporter = Exporter(format_type="json", schema_class=MySchema)
filename, content = exporter.export("test", queryset)
assert filename == "test.json"
assert isinstance(content, str)

# 字段过滤
filename, content = exporter.export("test", queryset, fields=["id", "name"])
data = json.loads(content)
assert all(set(item.keys()) == {"id", "name"} for item in data)

# 手动序列化
data = MySchema.serialize_queryset(queryset)
assert len(data) == queryset.count()
```
