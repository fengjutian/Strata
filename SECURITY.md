# 安全政策

**简体中文** · [English](#security-policy)

本文档说明 Strata 项目的安全规范与漏洞报告流程。保障系统安全是我们的首要任务，我们一直在努力维护防护能力，但仍可能出现漏洞。我们非常重视社区在发现和报告安全问题上的作用——这对维护系统完整性、保护用户至关重要。

## 报告漏洞

如果发现了安全漏洞，请把结果发送到 [security@strata.so](mailto:security@strata.so)。

报告中请包含我们复现和评估问题所需的全部信息，并附上受影响系统的 IP 地址或 URL。

为保证负责任且有效的披露流程，请遵守以下约定：

- 保持保密，在我们完成调查和修复之前不要公开披露漏洞。
- 未经事先同意，不要对我们的基础设施或管理后台运行自动化漏洞扫描。如确有需要，请联系我们搭建沙箱环境。
- 不要出于恶意目的利用发现的漏洞（例如访问或修改用户数据）。
- 不要进行物理安全攻击、社会工程、分布式拒绝服务（DDoS）攻击、垃圾信息投放，也不要以漏洞测试为由攻击第三方应用。

## 不在范围内

我们感谢所有帮助提升安全性的努力，但以下类型的问题不属于本政策范围：

- 需要中间人（MITM）攻击或物理接触用户设备才能触发的漏洞。
- 没有明确攻击向量、也无法修改 HTML/CSS 的内容欺骗或文本注入问题。
- 与邮件伪造相关的问题。
- 缺少 DNSSEC、CAA 或 CSP 响应头。
- 非敏感 Cookie 缺少 Secure 或 HttpOnly 标记。

## 我们的承诺

在漏洞处理的全过程中，我们承诺保持透明、协作的沟通。你可以期待：

- **响应时间** <br/>
  我们会在三个工作日内确认收到漏洞报告，并给出预计的修复时间。
- **法律保护** <br/>
  只要你遵守本报告的约定，我们不会因为你报告漏洞而对你采取法律行动。
- **保密** <br/>
  你的报告会被保密处理。未经你同意，我们不会向第三方披露你的个人信息。
- **致谢** <br/>
  在你允许的前提下，问题解决后我们乐于公开致谢你对提升安全性的贡献。
- **及时修复** <br/>
  我们会与你保持紧密协作，必要时及时同步进展。目标是尽快处理所有报告的问题，并在问题完全解决后与你协调负责任的披露。

感谢你帮助我们保障平台安全。你的贡献对保护用户、维护安全环境至关重要。

---

<br />

<a id="security-policy"></a>

# Security policy

This document outlines the security protocols and vulnerability reporting guidelines for the Strata project. Ensuring the security of our systems is a top priority, and while we work diligently to maintain robust protection, vulnerabilities may still occur. We highly value the community's role in identifying and reporting security concerns to uphold the integrity of our systems and safeguard our users.

## Reporting a vulnerability

If you have identified a security vulnerability, submit your findings to [security@strata.so](mailto:security@strata.so).

Ensure your report includes all relevant information needed for us to reproduce and assess the issue. Include the IP address or URL of the affected system.

To ensure a responsible and effective disclosure process, please adhere to the following:

- Maintain confidentiality and refrain from publicly disclosing the vulnerability until we have had the opportunity to investigate and address the issue.
- Refrain from running automated vulnerability scans on our infrastructure or dashboard without prior consent. Contact us to set up a sandbox environment if necessary.
- Do not exploit any discovered vulnerabilities for malicious purposes, such as accessing or altering user data.
- Do not engage in physical security attacks, social engineering, distributed denial of service (DDoS) attacks, spam campaigns, or attacks on third-party applications as part of your vulnerability testing.

## Out of scope

While we appreciate all efforts to assist in improving our security, please note that the following types of vulnerabilities are considered out of scope:

- Vulnerabilities requiring man-in-the-middle (MITM) attacks or physical access to a user's device.
- Content spoofing or text injection issues without a clear attack vector or the ability to modify HTML/CSS.
- Issues related to email spoofing.
- Missing DNSSEC, CAA, or CSP headers.
- Absence of secure or HTTP-only flags on non-sensitive cookies.

## Our commitment

At Strata, we are committed to maintaining transparent and collaborative communication throughout the vulnerability resolution process. Here's what you can expect from us:

- **Response Time** <br/>
  We will acknowledge receipt of your vulnerability report within three business days and provide an estimated timeline for resolution.
- **Legal Protection** <br/>
  We will not initiate legal action against you for reporting vulnerabilities, provided you adhere to the reporting guidelines.
- **Confidentiality** <br/>
  Your report will be treated with confidentiality. We will not disclose your personal information to third parties without your consent.
- **Recognition** <br/>
  With your permission, we are happy to publicly acknowledge your contribution to improving our security once the issue is resolved.
- **Timely Resolution** <br/>
  We are committed to working closely with you throughout the resolution process, providing timely updates as necessary. Our goal is to address all reported vulnerabilities swiftly, and we will actively engage with you to coordinate a responsible disclosure once the issue is fully resolved.

We appreciate your help in ensuring the security of our platform. Your contribution is crucial to protecting our users and maintaining a secure environment. Thank you for working with us to keep Strata safe.
