# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Strata backend package.

Loading ``apps/api/.env`` here -- before any submodule is imported -- makes
the package importable on a workstation. The compose stack injects the same
variables into the container, so in Docker and CI this file is simply absent
and nothing changes. Real environment variables always take precedence.
"""

import os
from pathlib import Path


def _load_local_env() -> None:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_local_env()

from .celery import app as celery_app  # noqa: E402

__all__ = ("celery_app",)
