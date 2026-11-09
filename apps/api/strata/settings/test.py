# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Test Settings"""

import os

from .common import *  # noqa


DEBUG = True

# Send it in a dummy outbox
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# The magic-link and email-code views refuse to issue a code when no SMTP
# host is configured. The compose test stack sets a placeholder for exactly
# this reason; set the same default here so the suite behaves the same way
# when it is run outside Docker.
os.environ.setdefault("EMAIL_HOST", "test-smtp.invalid")

INSTALLED_APPS.append(  # noqa
    "strata.tests"
)


# The API rate limiter reads its counters from the cache backend, and the
# test suite also calls ``cache.delete_pattern(...)``, which is a
# django_redis extension rather than a plain Redis command. The compose test
# stack provides a Redis container, but a workstation run has none, and every
# request that goes through the API key client then fails with a 500 from the
# throttle instead of exercising the code under test.
#
# Keep the django_redis backend (so its API is intact) but serve it from an
# in-process fake Redis server. Set STRATA_TEST_REDIS=1 to keep using a real
# Redis even when it is unreachable.
if not os.environ.get("STRATA_TEST_REDIS"):
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": "redis://127.0.0.1:6379/1",
            "OPTIONS": {
                "CLIENT_CLASS": "strata.settings.fake_redis_client.FakeRedisClient",
            },
        }
    }
    # Application code reaches Redis directly (magic codes, notification
    # tasks, the activity tracker) through ``redis_instance()``. Point that
    # at the same fake server, otherwise those call sites try to open a
    # socket to a Redis that is not running.
    USE_FAKE_REDIS = True
