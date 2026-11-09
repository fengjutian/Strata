# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Development settings for a container-free local run (see ``local-dev.ps1``).

This module only exists so the app can boot without Docker: ``local.py`` points
the cache at Redis, which is not installed on a plain Windows box. Everything
else is inherited from ``local.py`` unchanged.

The cache falls back to an in-process LocMemCache. Set ``STRATA_LOCAL_REDIS=1``
(``local-dev.ps1`` does it automatically when it finds a local redis-server) to
keep using the Redis cache from ``local.py``.
"""

import os

from .local import *  # noqa: F401,F403

if os.environ.get("STRATA_LOCAL_REDIS", "0") != "1":
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "strata-local",
        }
    }
