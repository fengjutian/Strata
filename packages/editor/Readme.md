# @strata/editor

## 说明

`@strata/editor` 是整个编辑器体系的基础包，提供其他编辑器包所依赖的公共能力。它不会被业务项目直接使用，只用于扩展出别的编辑器。

## 工具能力

我们提供了大量用于扩展编辑器内核的工具：

1. 合并 class 与自定义样式
2. 添加新的扩展（extension）
3. 添加自定义 props
4. 基础菜单项及其命令

这让基于该包构建的编辑器具备很强的定制与扩展能力。

### 导出内容概览

1. `useEditor`：用于扩展 Strata 编辑器的 hook。

   | 属性                      | 类型                                                             | 说明                                                                        |
   | ------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
   | `extensions`              | `Extension[]`                                                    | 要加入编辑器的自定义扩展数组                                                |
   | `editorProps`             | `EditorProps`                                                    | 传入自定义 props 对象以扩展编辑器属性                                       |
   | `uploadFile`              | `(file: File) => Promise<string>`                                | 文件上传处理函数，接收文件并完成上传流程                                    |
   | `deleteFile`              | `(assetUrlWithWorkspaceId: string) => Promise<any>`              | 图片删除处理函数，接收对象存储中的资源 URL 并完成删除                       |
   | `value`                   | `html string`                                                    | 编辑器初始内容                                                              |
   | `debouncedUpdatesEnabled` | `boolean`                                                        | 为 true 时 `onChange` 会被防抖，仅在用户停止输入后的延迟（默认 1500ms）触发 |
   | `onChange`                | `(json: any, html: string) => void`                              | 内容变化时触发，同时给出 JSON 与 HTML 两种格式                              |
   | `setIsSubmitting`         | `(isSubmitting: "submitting" \| "submitted" \| "saved") => void` | 更新提交状态                                                                |
   | `setShouldShowAlert`      | `(showAlert: boolean) => void`                                   | 内容未「保存」时显示或隐藏提示                                              |
   | `forwardedRef`            | `any`                                                            | 需要在外部组件控制编辑器状态时传入                                          |

2. `useReadOnlyEditor`：用于扩展只读编辑器的 hook。

   | 属性           | 类型          | 说明                                  |
   | -------------- | ------------- | ------------------------------------- |
   | `value`        | `string`      | 编辑器初始内容                        |
   | `forwardedRef` | `any`         | 需要在外部组件控制编辑器状态时传入    |
   | `extensions`   | `Extension[]` | 要加入编辑器的自定义扩展数组          |
   | `editorProps`  | `EditorProps` | 传入自定义 props 对象以扩展编辑器属性 |

3. Items 与 Commands：H1、H2、H3、任务列表、引用、代码块等方法。

4. UI 包装组件
   - `EditorContainer`：包住编辑器容器以应用基础 class 与样式。
   - `EditorContentWrapper`：获取编辑器内容与基础菜单。

5. 自定义样式扩展

```ts
const customEditorClassNames = getEditorClassNames({
  noBorder,
  borderOnFocus,
  customClassName,
});
```

## 核心特性

- **内容裁剪**：提交到后端前自动去掉首尾的空行，数据更干净一致。
- **值清洗**：在编辑器内核层完成 value 清洗，业务侧无需再额外校验，代码更简洁、出错更少。
- **Turbo 流水线**：为依赖本包的项目提供 dev 与 build 的 turbo 流水线。

## 内置的基础扩展

- BulletList
- OrderedList
- Blockquote
- Code
- Gapcursor
- Link
- Image
- 基础标记
  - Underline
  - TextStyle
  - Color
- TaskList
- Markdown
- Table
