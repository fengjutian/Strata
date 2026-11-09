# jscodeshift 使用说明

## API 参考

### 核心 API

#### `jscodeshift`

返回 jscodeshift 实例的主函数。

- **参数**：`source`（String）
- **示例**：

  ```javascript
  const j = jscodeshift(sourceCode);
  ```

### 节点遍历 API

#### `find`

查找匹配指定类型的节点。

- **参数**：`type`（String 或 Function）
- **示例**：

  ```javascript
  const variableDeclarations = j.find(j.VariableDeclaration);
  ```

#### `findImportDeclarations`

查找所有 ImportDeclaration，可按来源过滤。

- **参数**：`sourcePath`（String）
- **示例**：

  ```javascript
  const routerImports = j.findImportDeclarations("react-router-dom");
  ```

#### `closestScope`

找到节点最近的所属作用域。

- **示例**：

  ```javascript
  const closestScopes = j.find(j.Identifier).closestScope();
  ```

#### `closest`

向上查找最近的指定类型父节点。

- **参数**：`type`（String 或 Function）
- **示例**：

  ```javascript
  const closestFunction = j.find(j.Identifier).closest(j.FunctionDeclaration);
  ```

#### `getVariableDeclarators`

从当前集合中取出变量声明符。

- **参数**：`callback`（Function）
- **示例**：

  ```javascript
  const variableDeclarators = j
    .find(j.Identifier)
    .getVariableDeclarators((path) => path.value.name);
  ```

#### `findVariableDeclarators`

按名称查找变量声明符。

- **参数**：`name`（String）
- **示例**：

  ```javascript
  const variableDeclarators = j.findVariableDeclarators("a");
  ```

#### `filter`

按谓词函数过滤节点。

- **参数**：`predicate`（Function）
- **示例**：

  ```javascript
  const constDeclarations = j
    .find(j.VariableDeclaration)
    .filter((path) => path.node.kind === "const");
  ```

#### `forEach`

遍历集合中的每个节点。

- **参数**：`callback`（Function）
- **示例**：

  ```javascript
  j.find(j.VariableDeclaration).forEach((path) => {
    console.log(path.node);
  });
  ```

#### `some`

判断集合中是否至少有一个元素满足条件。

- **参数**：`callback`（Function）
- **示例**：

  ```javascript
  const hasVariableA = root
    .find(j.VariableDeclarator)
    .some((path) => path.node.id.name === "a");
  ```

#### `every`

判断集合中是否所有元素都满足条件。

- **参数**：`callback`（Function）
- **示例**：

  ```javascript
  const allAreConst = root
    .find(j.VariableDeclaration)
    .every((path) => path.node.kind === "const");
  ```

#### `map`

把集合中的每个节点映射为新值。

- **参数**：`callback`（Function）
- **示例**：

  ```javascript
  const variableNames = j
    .find(j.VariableDeclaration)
    .map((path) => path.node.declarations.map((decl) => decl.id.name));
  ```

#### `size`

返回集合中的节点数。

- **示例**：

  ```javascript
  const numberOfNodes = j.find(j.VariableDeclaration).size();
  ```

#### `length`

返回集合中的元素个数。

- **示例**：

  ```javascript
  const varCount = root.find(j.VariableDeclarator).length;
  ```

#### `nodes`

返回集合中的 AST 节点数组。

- **示例**：

  ```javascript
  const nodes = j.find(j.VariableDeclaration).nodes();
  ```

#### `paths`

返回找到的节点路径。

- **示例**：

  ```javascript
  const paths = j.find(j.VariableDeclaration).paths();
  ```

#### `getAST`

返回集合的根 AST 节点。

- **示例**：

  ```javascript
  const ast = root.getAST();
  ```

#### `get`

取得集合中的第一个节点。

- **示例**：

  ```javascript
  const firstVariableDeclaration = j.find(j.VariableDeclaration).get();
  ```

#### `at`

定位到 AST 中指定路径。

- **参数**：`index`（Number）
- **示例**：

  ```javascript
  const secondVariableDeclaration = j.find(j.VariableDeclaration).at(1);
  ```

#### `getTypes`

返回集合中出现的节点类型集合。

- **示例**：

  ```javascript
  const types = root.find(j.VariableDeclarator).getTypes();
  ```

#### `isOfType`

判断集合中的节点是否为指定类型。

- **参数**：`type`（String）
- **示例**：

  ```javascript
  const isVariableDeclarator = root
    .find(j.VariableDeclarator)
    .at(0)
    .isOfType("VariableDeclarator");
  ```

### 节点变换 API

#### `replaceWith`

用新节点替换当前节点。

- **参数**：`newNode`（Node 或 Function）
- **示例**：

  ```javascript
  j.find(j.Identifier).replaceWith((path) =>
    j.identifier(path.node.name.toUpperCase())
  );
  ```

#### `insertBefore`

在当前节点之前插入节点。

- **参数**：`newNode`（Node）
- **示例**：

  ```javascript
  j.find(j.FunctionDeclaration).insertBefore(
    j.expressionStatement(j.stringLiteral("Inserted before"))
  );
  ```

#### `insertAfter`

在当前节点之后插入节点。

- **参数**：`newNode`（Node）
- **示例**：

  ```javascript
  j.find(j.FunctionDeclaration).insertAfter(
    j.expressionStatement(j.stringLiteral("Inserted after"))
  );
  ```

#### `remove`

删除当前节点。

- **示例**：

  ```javascript
  j.find(j.VariableDeclaration).remove();
  ```

#### `renameTo`

把集合中的节点重命名为新名称。

- **参数**：`newName`（String）
- **示例**：

  ```javascript
  root.find(j.Identifier, { name: "a" }).renameTo("x");
  ```

#### `toSource`

把变换后的 AST 转回源码。

- **参数**：`options`（Object）
- **示例**：

  ```javascript
  const transformedSource = j.toSource({ quote: "single" });
  ```

## AST 语法

jscodeshift 提供 278 种节点类型，分别对应 `ast-types` 中的同名节点。

### 常见节点类型

- **AnyTypeAnnotation**：表示 any 的类型注解。
- **ArrayExpression**：数组字面量。
- **ArrayPattern**：解构赋值中匹配数组的模式。
- **ArrayTypeAnnotation**：数组的类型注解。
- **ArrowFunctionExpression**：箭头函数表达式。
- **AssignmentExpression**：赋值表达式。
- **AssignmentPattern**：解构赋值中匹配赋值的模式。
- **AwaitExpression**：await 表达式。
- **BigIntLiteral**：大整数字面量。
- **BinaryExpression**：二元表达式。
- **BlockStatement**：块语句。
- **BooleanLiteral**：布尔字面量。
- **BreakStatement**：break 语句。
- **CallExpression**：函数调用表达式。
- **CatchClause**：try 语句中的 catch 子句。
- **ClassDeclaration**：类声明。
- **ClassExpression**：类表达式。
- **ClassMethod**：类的方法。
- **ClassProperty**：类的属性。
- **Comment**：代码中的注释。
- **ConditionalExpression**：条件（三元）表达式。
- **ContinueStatement**：continue 语句。
- **DebuggerStatement**：debugger 语句。
- **Declaration**：代码中的声明。
- **DoWhileStatement**：do…while 语句。
- **ExportAllDeclaration**：export all 声明。
- **ExportDeclaration**：export 声明。
- **ExportDefaultDeclaration**：export default 声明。
- **ExportNamedDeclaration**：具名 export 声明。
- **ExpressionStatement**：表达式语句。
- **File**：AST 中的文件。
- **ForInStatement**：for-in 语句。
- **ForOfStatement**：for-of 语句。
- **ForStatement**：for 语句。
- **FunctionDeclaration**：函数声明。
- **FunctionExpression**：函数表达式。
- **Identifier**：标识符。
- **IfStatement**：if 语句。
- **ImportDeclaration**：import 声明。
- **ImportDefaultSpecifier**：默认导入说明符。
- **ImportNamespaceSpecifier**：命名空间导入说明符。
- **ImportSpecifier**：具名导入说明符。
- **InterfaceDeclaration**：接口声明。
- **JSXAttribute**：JSX 元素上的属性。
- **JSXElement**：JSX 元素。
- **JSXExpressionContainer**：JSX 中的表达式容器。
- **JSXFragment**：JSX Fragment。
- **JSXIdentifier**：JSX 中的标识符。
- **JSXText**：JSX 中的文本。
- **Literal**：字面量。
- **LogicalExpression**：逻辑表达式。
- **MemberExpression**：成员表达式。
- **MethodDefinition**：方法定义。
- **NewExpression**：new 表达式。
- **ObjectExpression**：对象表达式。
- **ObjectPattern**：解构用的对象模式。
- **ObjectProperty**：对象中的属性。
- **Program**：整个程序。
- **Property**：对象中的属性。
- **ReturnStatement**：return 语句。
- **SpreadElement**：数组或函数调用中的展开元素。
- **StringLiteral**：字符串字面量。
- **SwitchCase**：switch 中的 case 分支。
- **SwitchStatement**：switch 语句。
- **TemplateLiteral**：模板字符串。
- **ThisExpression**：`this` 表达式。
- **ThrowStatement**：throw 语句。
- **TryStatement**：try 语句。
- **TSAnyKeyword**：TypeScript 的 `any` 关键字。
- **TSArrayType**：TypeScript 数组类型。
- **TSAsExpression**：TypeScript 的 as 表达式。
- **TSBooleanKeyword**：TypeScript 的 `boolean` 关键字。
- **TSDeclareFunction**：TypeScript 函数声明。
- **TSEnumDeclaration**：TypeScript enum 声明。
- **TSInterfaceDeclaration**：TypeScript interface 声明。
- **TSNumberKeyword**：TypeScript 的 `number` 关键字。
- **TSStringKeyword**：TypeScript 的 `string` 关键字。
- **TSTypeAliasDeclaration**：TypeScript 类型别名声明。
- **TSTypeAnnotation**：TypeScript 类型注解。
- **TSTypeReference**：TypeScript 类型引用。
- **TSUnionType**：TypeScript 联合类型。
- **UnaryExpression**：一元表达式。
- **VariableDeclaration**：变量声明。
- **VariableDeclarator**：变量声明符。
- **WhileStatement**：while 语句。

完整列表与每种节点的结构见 [AST Grammar 文档](https://jscodeshift.com/build/ast-grammar/)。
