/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

/**
 * Chinese copy for the instance-admin app, keyed by the English source string.
 *
 * Admin shipped with every string hard-coded, so `tr()` translates at the call
 * site without waiting for a full key migration: `t("label")` -> `tr("label")`.
 * When the admin app is migrated to `@strata/i18n` keys, this table can be
 * folded into `packages/i18n/src/locales/<lang>/auth.json` and deleted.
 */
const ZH: Record<string, string> = {
  // shell / navigation
  "Instance admin": "实例管理员",
  "Instance admin menu": "实例管理员菜单",
  "Toggle sidebar": "展开/收起侧边栏",
  "Instance settings": "实例设置",
  Settings: "设置",
  "General settings": "通用设置",
  "Go to general settings": "前往通用设置",
  "Go back": "返回",
  "Account menu": "账户菜单",
  "Sign out": "退出登录",
  "Sign In": "登录",
  "Redirect to Strata": "前往 Strata",
  Help: "帮助",
  "Report a bug": "报告问题",
  "Join our Forum": "加入我们的论坛",
  "Learn more": "了解更多",
  "Learn more.": "了解更多。",
  Close: "关闭",
  Edit: "编辑",
  Configure: "配置",
  Retry: "重试",
  "Load more": "加载更多",
  Documentation: "文档",
  "Oops! Something went wrong.": "糟糕！出错了。",
  "Something went wrong.": "出错了。",
  Error: "错误",
  "Error!": "出错了！",
  Success: "成功",
  "Success!": "成功！",
  "You have unsaved changes": "有未保存的更改",
  "Strata icon": "Strata 图标",
  "Instance failure illustration": "实例故障插图",

  // general
  "Instance details": "实例详情",
  "Instance ID": "实例 ID",
  "Instance name": "实例名称",
  "Name of instance": "实例名称",
  "Admin email": "管理员邮箱",
  Email: "邮箱",
  Telemetry: "遥测",
  "Let Strata collect anonymous usage data": "允许 Strata 收集匿名使用数据",
  "Settings updated successfully": "设置已保存",

  // email
  "Email security": "邮件安全",
  "Secure emails from your own instance": "使用自有实例安全发送邮件",
  "Misconfigs can lead to email bounces and errors.": "配置错误会导致邮件退信和报错。",
  "Set it up below and please test your settings before you save them.": "在下方完成设置，并先测试再保存。",
  "Set it up below and please test your settings before you save them.&nbsp;": "在下方完成设置，并先测试再保存。",
  "Enable SMTP email": "启用 SMTP 邮件",
  "Sender's email address": "发件人邮箱",
  "Receiver email": "收件邮箱",
  "Select email security": "选择邮件加密方式",
  "Send test email": "发送测试邮件",
  Host: "主机",
  Port: "端口",
  Username: "用户名",
  Password: "密码",
  "Email Settings updated successfully": "邮件设置已保存",
  "Error disabling email": "停用邮件时出错",
  "Failed to disable email feature. Please try again.": "停用邮件功能失败，请重试。",
  "Email feature disabled": "邮件功能已停用",
  "Email feature has been disabled": "邮件功能已停用",
  "If you still cannot find it, recheck your SMTP configuration and trigger a new test email.":
    "如果仍然找不到，请检查 SMTP 配置后重新发送测试邮件。",
  "Strata can send useful emails to you and your users from your own instance without talking to the Internet.":
    "Strata 可以直接从你的实例向你和用户发送邮件，无需连接外部网络。",
  "This is optional, but we recommend setting up a username and a password for your SMTP server.":
    "这一步是可选的，但我们建议为 SMTP 服务器设置用户名和密码。",

  // authentication
  Authentication: "认证",
  "Manage authentication modes for your instance": "管理此实例的认证方式",
  "Configure authentication modes for your team and restrict sign-ups to be invite only.":
    "配置团队的认证方式，并将注册限制为仅限受邀用户。",
  "Available authentication modes": "可用的认证方式",
  "Enable login with passwords": "启用密码登录",
  "Enable login with email codes": "启用邮箱验证码登录",
  Passwords: "密码",
  "Unique codes": "唯一验证码",
  "Allow anyone to sign up even without an invite": "允许任何人无需邀请即可注册",
  "Toggling this off will only let users sign up when they are invited.": "关闭后，只有受邀用户才能注册。",
  "Cannot disable authentication": "无法停用认证",
  "Configuration saved": "配置已保存",
  "Enable GitHub": "启用 GitHub",
  "Enable GitHub authentication": "启用 GitHub 认证",
  "Enable GitLab": "启用 GitLab",
  "Enable GitLab authentication": "启用 GitLab 认证",
  "Enable Gitea": "启用 Gitea",
  "Enable Gitea authentication": "启用 Gitea 认证",
  "Enable Google": "启用 Google",
  "Enable Google authentication": "启用 Google 认证",
  "GitHub OAuth application settings": "GitHub OAuth 应用设置",
  "GitHub OAuth application settings.": "GitHub OAuth 应用设置。",
  "GitLab OAuth application": "GitLab OAuth 应用",
  "GitLab OAuth application settings": "GitLab OAuth 应用设置",
  "Gitea OAuth application settings": "Gitea OAuth 应用设置",
  "Gitea OAuth application settings.": "Gitea OAuth 应用设置。",
  "Gitea Host": "Gitea 主机",
  "Google Cloud Console OAuth client credentials": "Google Cloud Console 的 OAuth 客户端凭据",
  "Client ID": "客户端 ID",
  "Client secret": "客户端密钥",
  "Callback URL": "回调 URL",
  "Callback URI": "回调 URI",
  "Authorized Redirect URI": "授权重定向 URI",
  "Authorized Callback URI": "授权回调 URI",
  "Authorized JavaScript origins": "授权的 JavaScript 来源",
  "Authorized origin URL": "授权来源 URL",
  "Redirect URI": "重定向 URI",
  "Origin URL": "来源 URL",
  "Application ID": "应用 ID",
  Secret: "密钥",
  "Organization ID": "组织 ID",
  "The organization github ID.": "GitHub 组织 ID。",
  "This is either https://gitlab.com or the": "填写 https://gitlab.com 或你的",
  "We will auto-generate this. Paste this into the": "我们会自动生成，请将其粘贴到",
  "We will auto-generate this. Paste this into your": "我们会自动生成，请将其粘贴到你的",
  "Unsplash developer account documentation": "Unsplash 开发者账户文档",
  "Access key from your Unsplash account": "Unsplash 账户的访问密钥",
  "You will find your access key in your Unsplash developer console.": "可在 Unsplash 开发者控制台找到访问密钥。",
  "You will find your access key in your Unsplash developer console.&nbsp;": "可在 Unsplash 开发者控制台找到访问密钥。",
  "Google OAuth client ID documentation": "Google OAuth 客户端 ID 文档",
  "Google OAuth client secret documentation": "Google OAuth 客户端密钥文档",
  "OpenAI API keys page": "OpenAI API 密钥页面",
  "OpenAI models documentation": "OpenAI 模型文档",
  "Use the URL of your Gitea instance. For the official Gitea instance, use &quot;https://gitea.com&quot;.":
    "填写你的 Gitea 实例 URL；官方实例请使用 &quot;https://gitea.com&quot;。",
  "Allow members to login or sign up to strata with their GitHub accounts.":
    "允许成员使用 GitHub 账号登录或注册 Strata。",
  "Allow members to login or sign up to strata with their GitLab accounts.":
    "允许成员使用 GitLab 账号登录或注册 Strata。",
  "Allow members to login or sign up to strata with their Gitea accounts.":
    "允许成员使用 Gitea 账号登录或注册 Strata。",
  "Allow members to login or sign up to strata with their Google accounts.":
    "允许成员使用 Google 账号登录或注册 Strata。",
  "Allow members to log in or sign up for Strata with their GitHub accounts.":
    "允许成员使用 GitHub 账号登录或注册 Strata。",
  "Allow members to log in or sign up for Strata with their Google accounts.":
    "允许成员使用 Google 账号登录或注册 Strata。",
  "Allow members to log in or sign up to strata with their GitLab accounts.":
    "允许成员使用 GitLab 账号登录或注册 Strata。",
  "Allow members to log in or sign up to strata with their Gitea accounts.":
    "允许成员使用 Gitea 账号登录或注册 Strata。",

  // workspaces
  "Workspaces on this instance": "此实例上的工作区",
  "All workspaces on this instance": "此实例上的所有工作区",
  "See all workspaces and control who can create them.": "查看所有工作区，并控制谁可以创建。",
  "Create a new workspace on this instance.": "在此实例上创建新的工作区。",
  "Create workspace": "创建工作区",
  "Total members:": "成员总数：",
  "Total projects:": "项目总数：",
  "Prevent anyone else from creating a workspace": "禁止其他人创建工作区",
  "Prevent anyone else from creating a workspace.": "禁止其他人创建工作区。",
  "Toggling this on will let only you create workspaces. You will have to invite users to new workspaces.":
    "开启后只有你可以创建工作区，新工作区需要你邀请用户加入。",
  "The unique URL of your workspace": "工作区的唯一 URL",
  "Something familiar and recognizable is always best.": "熟悉且易于识别的名称最好。",
  "Owned by:": "所有者：",
  "You will need to invite users from Workspace Settings after you create this workspace.":
    "创建后需在工作区设置中邀请成员。",
  "You can&apos;t yet delete workspaces and you can only go to the workspace if you are an Admin or a Member.":
    "目前还不能删除工作区；只有管理员或成员才能进入该工作区。",
  "Workspace created successfully.": "工作区创建成功。",
  "Workspace could not be created. Please try again.": "无法创建工作区，请重试。",
  "Some error occurred while creating workspace. Please try again.": "创建工作区时出错，请重试。",
  "Instance setup done! Welcome to Strata instance portal. Start your journey with by creating your first workspace.":
    "实例设置完成！欢迎来到 Strata 实例门户，创建第一个工作区即可开始使用。",

  // ai / images
  "AI features for all your workspaces": "为所有工作区启用 AI 功能",
  "If you use ChatGPT, this is for you.": "如果你使用 ChatGPT，这个适合你。",
  "API key": "API 密钥",
  "LLM Model": "LLM 模型",
  "Third-party image libraries": "第三方图库",
  "Let your users search and choose images from third-party libraries": "允许用户从第三方图库搜索并选择图片",
  "AI Settings updated successfully": "AI 设置已保存",
  "Image Configuration Settings updated successfully": "图片设置已保存",

  // page titles
  "General Settings - God Mode": "通用设置 - 实例管理",
  "Authentication Settings - Strata Web": "认证设置 - Strata Web",
  "Artificial Intelligence Settings - God Mode": "AI 设置 - 实例管理",
  "AI Settings - God Mode": "AI 设置 - 实例管理",
  "Email Settings - God Mode": "邮件设置 - 实例管理",
  "Images Settings - God Mode": "图片设置 - 实例管理",
  "Workspace Management - God Mode": "工作区管理 - 实例管理",
  "Create Workspace - God Mode": "创建工作区 - 实例管理",
  "GitHub Authentication - God Mode": "GitHub 认证 - 实例管理",
  "GitLab Authentication - God Mode": "GitLab 认证 - 实例管理",
  "Gitea Authentication - God Mode": "Gitea 认证 - 实例管理",
  "Google Authentication - God Mode": "Google 认证 - 实例管理",
  "Admin – Instance Setup & Sign-In": "管理员 – 实例安装与登录",
  Web: "网页",

  // 404 / errors
  "Sorry, the page you are looking for cannot be found. It may have been removed, had its name changed, or is temporarily unavailable.":
    "抱歉，找不到你要访问的页面。它可能已被删除、更名或暂时不可用。",
  "Unable to fetch instance details.": "无法获取实例详情。",
  "We were unable to fetch the details of the instance. Fret not, it might just be a connectivity issue.":
    "无法获取实例详情，别担心，可能只是网络连接问题。",
  "GitHub Logo": "GitHub 图标",
  "GitLab Logo": "GitLab 图标",
  "Gitea Logo": "Gitea 图标",
  "Google Logo": "Google 图标",
  "Admin user already exists.": "管理员用户已存在。",
  "Admin user already exists.&nbsp;": "管理员用户已存在。",
  "Admin user does not exist.": "管理员用户不存在。",
  "Admin user does not exist.&nbsp;": "管理员用户不存在。",
  // sidebar menu + breadcrumbs
  General: "通用",
  "Artificial Intelligence": "人工智能",
  "Artificial intelligence": "人工智能",
  "Images in Strata": "Strata 图片",
  Image: "图片",
  Workspace: "工作区",
  Workspaces: "工作区",
  Create: "创建",
  "Identify your instances and get key details.": "查看实例标识与关键信息。",
  "Configure your SMTP controls.": "配置 SMTP 邮件发送。",
  "Manage all workspaces on this instance.": "管理此实例上的所有工作区。",
  "Configure authentication modes.": "配置认证方式。",
  "Configure your OpenAI creds.": "配置 OpenAI 凭据。",
  "Allow third-party image libraries.": "允许使用第三方图库。",
};

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

/** Translate a hard-coded admin string; falls back to the source text. */
export function tr(text: string): string {
  if (typeof window === "undefined") return text;
  const language = window.localStorage.getItem("userLanguage") ?? "zh-CN";
  if (!language.toLowerCase().startsWith("zh")) return text;
  return ZH[normalize(text)] ?? text;
}
