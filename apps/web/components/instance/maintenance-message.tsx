/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export function MaintenanceMessage() {
  const linkMap = [
    {
      key: "mail_to",
      label: "联系支持团队",
      value: "mailto:support@strata.so",
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <h1 className="text-left text-h5-semibold text-primary">&#x1F6A7; Strata 似乎未能正常启动！</h1>
        <span className="text-left text-body-sm-medium text-secondary">
          某些服务可能启动失败。请检查容器日志以定位并解决问题。如果仍无法解决，请联系支持团队获取帮助。
        </span>
      </div>
      <div className="mt-1 flex items-center justify-start gap-6">
        {linkMap.map((link) => (
          <div key={link.key}>
            <a
              href={link.value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body-xs-regular text-accent-primary hover:underline"
            >
              {link.label}
            </a>
          </div>
        ))}
      </div>
    </>
  );
}
