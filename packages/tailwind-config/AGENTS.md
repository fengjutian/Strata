# 设计系统理念指南

## 概览

本指南说明用于构建一致、可维护 UI 的语义化设计系统理念。整个系统建立在三个核心概念之上：**Canvas**、**Surface** 与 **Layer**。

## 核心概念

### 1. Canvas（`bg-canvas`）

**是什么**：应用级背景，是所有内容的基础。Canvas 指的是**整个应用的背景**，而不是单个页面的背景。整个应用中只有**一个 canvas**，且位于根层级。

**何时使用**：

- **只在应用根部**——包裹整个应用的那个根容器
- 应用主背景（不是页面背景）

**何时不要使用**：

- ❌ 页面级背景
- ❌ 嵌套容器
- ❌ 卡片或组件
- ❌ 弹窗或下拉菜单
- ❌ 侧边栏或面板
- ❌ 应用中的其他任何位置

**关键规则**：Canvas 在整个应用中只能出现**一次**，且位于根层级。所有页面、路由与组件都叠在这唯一一个 canvas 之上。

**示例**：

```tsx
// ✅ 正确：Canvas 只在应用根部使用
// App.tsx 或根布局
<div className="bg-canvas min-h-screen">
  {/* 所有应用内容都在这里 */}
  <Routes>
    <Route path="/" element={<Page />} />
  </Routes>
</div>;

// ✅ 正确：页面使用 surface，而不是 canvas
function Page() {
  return <div className="bg-surface-1">{/* 页面内容 */}</div>;
}

// ❌ 错误：页面使用了 canvas
function Page() {
  return <div className="bg-canvas">{/* 不要在这里用 canvas */}</div>;
}

// ❌ 错误：卡片使用了 canvas
<div className="bg-canvas p-4 rounded-md">{/* 卡片内容 */}</div>;
```

### 2. Surface（`bg-surface-1`、`bg-surface-2`、`bg-surface-3`）

**是什么**：直接位于 canvas 之上的顶层容器。Surface 之间永不重叠——它们在布局层级中是兄弟关系。

**何时使用**：

- 主内容区域
- 页面的分区
- 主要容器
- 并排放置的面板

**Surface 层级**：

- `bg-surface-1`：主 surface（最常用）
- `bg-surface-2`：次级 surface（用于变化）
- `bg-surface-3`：三级 surface（少用，特殊场景）

**规则**：

- Surface 之间是**兄弟**关系，不是嵌套关系（同一层）
- 每个 surface 的嵌套元素应使用与之对应的 layer
- Surface 是叠加 layer 的基础

**例外——不同的层（strata）**：

- 弹窗、遮罩、弹出层位于**另一层**（不同的 z-index / 层叠上下文）
- 这种情况下，即使下方已有 surface，也可以再使用 surface
- 因为它们在视觉与功能上与下方内容相互独立

**示例**：

```tsx
// ✅ 正确：Surface 作为兄弟
<div className="bg-canvas">
  <div className="bg-surface-1">
    {/* 主内容区域 */}
  </div>
  <div className="bg-surface-2">
    {/* 次级内容区域——兄弟，不是嵌套 */}
  </div>
</div>

// ✅ 正确：页面包含 header 与 main（同一个 surface）
<div className="bg-surface-1">
  <header className="border-b border-subtle">
    {/* header 属于这个 surface，不是另一个 surface */}
  </header>
  <main>
    {/* main 属于这个 surface，不是另一个 surface */}
  </main>
</div>

// ❌ 错误：同一层里 surface 嵌套 surface
<div className="bg-surface-1">
  <div className="bg-surface-2">
    {/* 这违背了设计理念 */}
  </div>
</div>

// ✅ 正确：弹窗位于另一层
<div className="bg-canvas">
  {/* 主页面内容 */}
  <div className="bg-surface-1">
    Page content
  </div>

  {/* 弹窗遮罩——另一层 */}
  <div className="fixed inset-0 z-50">
    <div className="bg-backdrop fixed inset-0" />
    <div className="bg-surface-1 rounded-lg shadow-lg p-6">
      {/* 页面用了 surface-1，弹窗仍可使用 surface-1 */}
      Modal content
    </div>
  </div>
</div>
```

### 3. Layer（`bg-layer-1`、`bg-layer-2`、`bg-layer-3`）

**是什么**：在 surface 内部制造层次感的叠加层。Layer 按既定顺序逐层叠加。

**何时使用**：

- Surface 内的卡片
- 分组标题
- 嵌套容器
- 下拉菜单与弹窗
- 侧边栏
- 任何需要在 surface 之上「浮起来」的元素

**Layer 层级**：

- `bg-layer-1`：第一层（最贴近 surface）
- `bg-layer-2`：第二层（叠在 layer-1 之上）
- `bg-layer-3`：第三层（叠在 layer-2 之上）

**关键规则——Layer 与 Surface 的对应关系**：

- `bg-surface-1` → 嵌套元素用 `bg-layer-1`
- `bg-surface-2` → 嵌套元素用 `bg-layer-2`
- `bg-surface-3` → 嵌套元素用 `bg-layer-3`

**少见的例外——视觉分隔**：

极少数情况下，为了把特定 UI 元素与背景区分开，可以上浮一层：

- 弹窗里的输入框（弹窗是 `bg-surface-1`，输入框可用 `bg-layer-2` 增强区分）
- 需要更强视觉区分的按钮、开关与表单控件
- **重要**：这非常少见，只用于交互式表单元素，不要用于内容盒子或卡片

**示例**：

```tsx
// ✅ 正确：surface-1 配 layer-1
<div className="bg-surface-1 p-4">
  <div className="bg-layer-1 hover:bg-layer-1-hover rounded-md p-3">
    Card content
  </div>
</div>

// ✅ 正确：surface-2 配 layer-2
<div className="bg-surface-2 p-4">
  <div className="bg-layer-2 hover:bg-layer-2-hover rounded-md p-3">
    Card content
  </div>
</div>

// ❌ 错误：surface-1 配 layer-2（内容盒子场景）
<div className="bg-surface-1 p-4">
  <div className="bg-layer-2">
    {/* 层号不匹配——内容盒子请用 layer-1 */}
  </div>
</div>

// ✅ 正确：少见例外——弹窗中的输入框
<div className="bg-surface-1 rounded-lg p-6">
  <form>
    <input className="bg-layer-2 border border-subtle rounded-md px-3 py-2" />
    {/* 输入框用 layer-2 与弹窗 surface 区分 */}
  </form>
</div>
```

## 层级叠加

### 如何叠加

顺序为：surface → layer-1 → layer-2 → layer-3

**结构**：

```
Canvas
  └── Surface
      └── Layer 1（第一层深度）
          └── Layer 2（第二层深度）
              └── Layer 3（第三层深度）
```

**示例——正确的叠加**：

```tsx
// ✅ 正确：逐层叠加
<div className="bg-surface-1 p-4">
  {/* Layer 1：卡片 */}
  <div className="bg-layer-1 hover:bg-layer-1-hover rounded-md p-4">
    <h3>Card Title</h3>

    {/* Layer 2：嵌套区块 */}
    <div className="bg-layer-2 hover:bg-layer-2-hover rounded p-2 mt-2">
      Nested content
      {/* Layer 3：更深一层 */}
      <div className="bg-layer-3 hover:bg-layer-3-hover rounded p-1 mt-1">Deep content</div>
    </div>
  </div>
</div>
```

**各层的使用场景**：

- **Layer 1**：最常用——卡片、标题栏、主要嵌套元素
- **Layer 2**：次级深度——嵌套卡片、子区块
- **Layer 3**：深层嵌套——很少需要，用于复杂层级

## 状态变体

### Hover 状态

**关键规则**：hover 必须与基础背景层一致。

**写法**：`bg-layer-X hover:bg-layer-X-hover`

**示例**：

```tsx
// ✅ 正确：hover 与基础层匹配
<div className="bg-layer-1 hover:bg-layer-1-hover">
  Hoverable element
</div>

<div className="bg-layer-2 hover:bg-layer-2-hover">
  Hoverable element
</div>

// ❌ 错误：hover 与基础层不匹配
<div className="bg-layer-1 hover:bg-layer-2-hover">
  {/* 永远不要这样写 */}
</div>
```

### Active 状态

元素处于激活/按下状态时使用 `-active` 变体。

```tsx
// ✅ 正确：active 状态
<button
  className={cn("bg-layer-1 hover:bg-layer-1-hover", {
    "bg-layer-1-active": isActive,
  })}
>
  Button
</button>
```

### Selected 状态

只有在存在真实选中逻辑时才使用 `-selected` 变体。

```tsx
// ✅ 正确：带选中逻辑
<div className={cn(
  "bg-layer-1 hover:bg-layer-1-hover",
  {
    "bg-layer-1-selected": isSelected
  }
)}>
  Selectable item
</div>

// ✅ 正确：使用 data 属性
<div className="bg-layer-1 hover:bg-layer-1-hover data-[selected]:bg-layer-1-selected">
  Selectable item
</div>
```

## 常见模式

### 模式 1：应用根布局

```tsx
// ✅ 正确：应用根（全局唯一使用 canvas 的地方）
// App.tsx 或根布局
<div className="bg-canvas min-h-screen">
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/dashboard" element={<DashboardPage />} />
  </Routes>
</div>;

// ✅ 正确：单个页面的结构
function HomePage() {
  return (
    <div className="bg-surface-1">
      {/* 顶栏——属于页面 surface，用 layer 体现层次 */}
      <header className="border-b border-subtle">
        <div className="bg-layer-1 hover:bg-layer-1-hover px-4 py-2">Header content</div>
      </header>

      {/* 主内容——属于页面 surface */}
      <main className="p-6">
        <div className="bg-layer-1 hover:bg-layer-1-hover rounded-md p-4">Content card</div>
      </main>
    </div>
  );
}
```

### 模式 2：带嵌套元素的卡片

```tsx
// ✅ 正确：分层正确的卡片
<div className="bg-surface-1 p-4">
  <div className="bg-layer-1 hover:bg-layer-1-hover rounded-md p-4">
    <h3 className="text-primary font-semibold">Card Title</h3>

    {/* 嵌套区块 */}
    <div className="bg-layer-2 hover:bg-layer-2-hover rounded p-3 mt-3">
      <p className="text-secondary">Nested content</p>
    </div>
  </div>
</div>
```

### 模式 3：下拉菜单 / 弹窗

```tsx
// ✅ 正确：弹窗结构（不同层的例外）
function PageWithModal() {
  return (
    <div className="bg-surface-1">
      {/* 主页面内容 */}
      <div>Page content</div>

      {/* 弹窗——不同层，下方已有 surface 也可以再用 surface */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="bg-backdrop fixed inset-0" />
          <div className="bg-surface-1 rounded-lg shadow-lg p-6">
            <div className="bg-layer-1 hover:bg-layer-1-hover rounded p-2">Modal content</div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 模式 4：侧边栏布局

```tsx
// ✅ 正确：侧边栏 + 主内容（页面级，不是应用根）
// 侧边栏与主内容都是同一 surface 上的兄弟
// 侧边栏菜单项用透明背景 + hover 状态
function DashboardPage() {
  return (
    <div className="bg-surface-1 flex">
      {/* 侧边栏——属于页面 surface */}
      <aside className="border-r border-subtle w-64">
        <div className="hover:bg-layer-1-hover p-4">Sidebar item</div>
      </aside>

      {/* 主内容——属于页面 surface */}
      <main className="flex-1 p-6">
        <div className="bg-layer-1 hover:bg-layer-1-hover rounded-md p-4">Main content</div>
      </main>
    </div>
  );
}
```

### 模式 5：列表

```tsx
// ✅ 正确：列表结构
<div className="bg-surface-1 p-4">
  <div className="bg-layer-1 hover:bg-layer-1-hover rounded-md mb-2 p-3">List item 1</div>
  <div className="bg-layer-1 hover:bg-layer-1-hover rounded-md mb-2 p-3">List item 2</div>
  <div className="bg-layer-1 hover:bg-layer-1-hover rounded-md p-3">List item 3</div>
</div>
```

### 模式 6：表单

```tsx
// ✅ 正确：表单结构
<div className="bg-surface-1 p-6">
  <form className="bg-layer-1 rounded-md p-4 space-y-4">
    <div>
      <label className="text-primary font-medium">Name</label>
      {/* 输入框可以用 bg-surface-1 或 bg-layer-2 做视觉区分（少见例外） */}
      <input className="bg-surface-1 border border-subtle rounded-md px-3 py-2 text-primary" type="text" />
    </div>

    <button className="bg-layer-2 hover:bg-layer-2-hover rounded-md px-4 py-2 text-primary">Submit</button>
  </form>
</div>

// ✅ 正确：弹窗中的输入框（用于视觉区分的少见例外）
<div className="bg-surface-1 rounded-lg p-6">
  <form>
    <label className="text-primary font-medium">Name</label>
    {/* 输入框用 layer-2 与弹窗 surface 区分——少见例外 */}
    <input className="bg-layer-2 border border-subtle rounded-md px-3 py-2 text-primary" type="text" />
  </form>
</div>
```

## 决策树

### 什么时候用 Canvas？

```
这是整个应用的根容器吗？
（全应用只有一处）
├─ 是 → 用 bg-canvas（仅应用根）
└─ 否 → 继续判断 Surface
```

### 什么时候用 Surface？

```
这是直接位于 canvas 之上的顶层容器吗？
并且
它与其他容器是兄弟关系（不是嵌套）？
或者
它是位于另一层（z-index）的弹窗/遮罩？
├─ 是 → 用 bg-surface-1（变化场景用 surface-2/3）
└─ 否 → 继续判断 Layer
```

### 什么时候用 Layer？

```
它嵌套在某个 surface 内部吗？
├─ 是 → 用 bg-layer-1（更深用 layer-2/3）
│        层号要与 surface 号对应
└─ 否 → 重新评估：它是不是应该做成 surface？
```

## 文本颜色

按层级使用语义化文本颜色：

- `text-primary`：主文本、标题、重要内容
- `text-secondary`：次级文本、描述
- `text-tertiary`：三级文本、标签、元信息
- `text-placeholder`：占位文本、提示

**示例**：

```tsx
<div className="bg-layer-1 p-4">
  <h2 className="text-primary font-semibold">Title</h2>
  <p className="text-secondary">Description text</p>
  <span className="text-tertiary text-13">Metadata</span>
  <input className="placeholder-(--text-color-placeholder)" placeholder="Enter text..." />
</div>
```

## 边框颜色

使用语义化边框颜色：

- `border-subtle`：弱边框、分隔线
- `border-subtle-1`：稍明显的边框
- `border-strong`：强边框、强调
- `border-strong-1`：更强边框

**示例**：

```tsx
<div className="bg-layer-1 border border-subtle rounded-md p-4">
  <div className="border-b border-subtle-1 pb-2 mb-2">Section with divider</div>
</div>
```

## 常见错误

### ❌ 错误 1：页面或卡片用了 canvas

```tsx
// ❌ 错误：页面用 canvas
function Page() {
  return <div className="bg-canvas">Page content</div>;
}

// ❌ 错误：卡片用 canvas
<div className="bg-canvas rounded-md p-4">Card content</div>;

// ✅ 正确：页面用 surface
function Page() {
  return (
    <div className="bg-surface-1">
      <div className="bg-layer-1 rounded-md p-4">Card content</div>
    </div>
  );
}
```

### ❌ 错误 2：同一层里嵌套 surface

```tsx
// ❌ 错误：同一层里 surface 嵌套
<div className="bg-surface-1">
  <div className="bg-surface-2">
    Nested surface
  </div>
</div>

// ✅ 正确：改用 layer
<div className="bg-surface-1">
  <div className="bg-layer-1">
    Nested layer
  </div>
</div>

// ✅ 正确：例外——弹窗在另一层
<div className="bg-canvas">
  <div className="bg-surface-1">Page content</div>
  <div className="fixed inset-0 z-50">
    <div className="bg-surface-1">Modal（不同层）</div>
  </div>
</div>
```

### ❌ 错误 3：Layer 与 Surface 不匹配

```tsx
// ❌ 错误：surface-1 配 layer-2（内容盒子）
<div className="bg-surface-1">
  <div className="bg-layer-2">
    Content box
  </div>
</div>

// ✅ 正确：surface-1 配 layer-1（内容盒子）
<div className="bg-surface-1">
  <div className="bg-layer-1">
    Content box
  </div>
</div>

// ✅ 正确：少见例外——输入框/按钮做视觉区分
<div className="bg-surface-1">
  <input className="bg-layer-2" />
  {/* 输入框用 layer-2 做视觉区分——非常少见的例外 */}
</div>
```

**说明**：上浮一层（例如 `bg-surface-1` 配 `bg-layer-2`）仅在极少见的交互式表单元素（输入框、按钮、开关）需要额外视觉分隔时才成立。内容盒子、卡片和普通嵌套元素，层号必须与 surface 号一致。

### ❌ 错误 4：Hover 不匹配

```tsx
// ❌ 错误
<div className="bg-layer-1 hover:bg-layer-2-hover">
  Content
</div>

// ✅ 正确
<div className="bg-layer-1 hover:bg-layer-1-hover">
  Content
</div>
```

### ❌ 错误 5：缺少 hover 前缀

```tsx
// ❌ 错误
<div className="bg-layer-1-hover">
  Content
</div>

// ✅ 正确
<div className="bg-layer-1 hover:bg-layer-1-hover">
  Content
</div>
```

## 最佳实践

1. **Canvas 只用于应用根**：整个应用只出现一次，位于根层级（App.tsx 或根布局）。所有页面都用 surface，不用 canvas。
2. **页面与顶层容器用 Surface**：Surface 之间是兄弟关系，不是嵌套（不同层的弹窗/遮罩除外）。
3. **Layer 与 Surface 对应**：surface-1 → layer-1，surface-2 → layer-2，以此类推（极少数例外：表单元素可上浮一层做视觉区分）。
4. **正确叠加**：按需使用 layer-1 → layer-2 → layer-3。
5. **Hover 必须匹配**：基础是 `bg-layer-X`，hover 就必须是 `hover:bg-layer-X-hover`。
6. **使用语义化文本颜色**：按重要性选择 primary / secondary / tertiary / placeholder。
7. **保持简单**：不要过度嵌套，多数组件只需要 layer-1。
8. **检查视觉层次**：确认叠加关系确实形成了清晰的层次感。

## 速查

### 层级结构

```
Canvas（每个页面一个）
  └── Surface 1（顶层容器）
      └── Layer 1（第一层深度）
          └── Layer 2（第二层）
              └── Layer 3（第三层）
```

### 常见组合

- 应用根：`bg-canvas`（全应用唯一一处）
- 单 surface 页面：`bg-surface-1` → `bg-layer-1`
- 多 surface 页面：多个 `bg-surface-1`（或 `bg-surface-2`）作为兄弟
- 卡片：`bg-surface-1` → `bg-layer-1 hover:bg-layer-1-hover`
- 嵌套卡片：`bg-surface-1` → `bg-layer-1` → `bg-layer-2`
- 侧边栏布局：`bg-surface-1`（侧边栏）+ `bg-surface-1`（主内容），两者是兄弟
- 侧边栏菜单项：透明背景 + `hover:bg-layer-1-hover`（不写 `bg-layer-1`）

### 状态变体

- Hover：`bg-layer-X hover:bg-layer-X-hover`
- Active：`bg-layer-X-active`（按下/激活时）
- Selected：`bg-layer-X-selected`（选中时）

## 自查清单

评审组件时确认：

- [ ] Canvas 只用在应用根（全应用一处）
- [ ] 页面使用 surface，而不是 canvas
- [ ] Surface 是兄弟关系，不嵌套（不同层的弹窗/遮罩除外）
- [ ] Layer 与 Surface 匹配（surface-1 → layer-1），表单元素的极少数例外除外
- [ ] 侧边栏菜单项使用透明背景 + hover 状态
- [ ] Hover 状态与基础层一致
- [ ] Layer 正确叠加（1 → 2 → 3）
- [ ] 文本颜色语义化（primary / secondary / tertiary / placeholder）
- [ ] 边框使用语义颜色（subtle / strong）
- [ ] 没有不必要的嵌套
- [ ] 视觉层次清晰
- [ ] 状态变体使用正确
- [ ] 弹窗/遮罩使用 surface（嵌套规则的例外）
