## 版权头检查

**简体中文** · [English](#copyright-check)

要验证所有受版本控制的 Python 文件都带有 **Strata Software Inc.** 的版权头（年份 **2023**），在仓库根目录执行：

```bash
addlicense --check -f COPYRIGHT.txt -ignore "**/migrations/**" $(git ls-files '*.py')
```

#### 应用修改

Python 文件：

```bash
addlicense -v -f COPYRIGHT.txt -ignore "**/migrations/**" $(git ls-files '*.py')
```

指定应用下的 ts / tsx 文件：

```bash
addlicense -v -f COPYRIGHT.txt \
  -ignore "**/*.config.ts" \
  -ignore "**/*.d.ts" \
  $(git ls-files 'packages/*.ts')
```

> 注意：ts 命令请在具体目录下执行。对整个 monorepo 一次性执行会导致系统进程崩溃。

#### 其他参数

- **`addlicense -check`**：仅检查模式，任何文件缺失或版权头不正确都会失败。
- **`-c "Strata Software Inc."`**：设置版权持有者。
- **`-f LICENSE.txt`**：使用 `LICENSE.txt` 的内容与格式作为版权头模板。
- **`-y 2023`**：设置版权年份。
- **`$(git ls-files '*.py')`**：把检查范围限制在 git 跟踪的 Python 文件。

---

<br />

<a id="copyright-check"></a>

## Copyright check

To verify that all tracked Python files contain the correct copyright header for **Strata Software Inc.** for the year **2023**, run this command from the repository root:

```bash
addlicense --check -f COPYRIGHT.txt -ignore "**/migrations/**" $(git ls-files '*.py')
```

#### To Apply Changes

python files

```bash
addlicense -v -f COPYRIGHT.txt -ignore "**/migrations/**" $(git ls-files '*.py')
```

ts and tsx files in a specific app

```bash
addlicense -v -f COPYRIGHT.txt \
  -ignore "**/*.config.ts" \
  -ignore "**/*.d.ts" \
  $(git ls-files 'packages/*.ts')
```

Note: Please make sure the ts command is running on a specific folder, running it for the whole monorepo crashes OS processes.

#### Other Options

- **`addlicense -check`**: runs in check-only mode and fails if any file is missing or has an incorrect header.
- **`-c "Strata Software Inc."`**: sets the copyright holder.
- **`-f LICENSE.txt`**: uses the contents and format defined in `LICENSE.txt` as the header template.
- **`-y 2023`**: sets the year in the header.
- **`$(git ls-files '*.py')`**: restricts the check to Python files tracked in git.
