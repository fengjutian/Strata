<br /><br />

<p align="center">
<a href="https://strata.so">
  <img src="https://strata-marketing.s3.ap-south-1.amazonaws.com/strata-readme/strata_logo_.webp" alt="Strata Logo" width="70">
</a>
</p>

<h3 align="center"><b>Strata Space</b></h3>
<p align="center"><b>开源、可私有化部署的项目规划工具</b></p>

Strata Space 用于对外公开分享 Strata 中的内容（工作项、页面、视图等），访问者通常无需登录即可查看。

## 开发

在仓库根目录执行：

```bash
# 启动全部应用
pnpm dev

# 只启动 space（默认端口 3002）
pnpm --filter space dev
```

环境变量见根目录与 `apps/space/` 下的 `.env.example`，`./setup.sh` 会自动复制为 `.env`。

## 构建与启动

```bash
pnpm --filter space build     # react-router build
pnpm --filter space start     # 以 3002 端口启动构建产物
```
