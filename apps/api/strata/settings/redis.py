# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import redis
from django.conf import settings


def redis_instance():
    """Return a Redis client for the configured ``REDIS_URL``.

    This is the low-level accessor: it always talks to the configured URL,
    so tests that assert on TLS options, credentials or database selection
    can exercise the real construction path.
    """
    # connect to redis
    if settings.REDIS_SSL and settings.REDIS_URL and settings.REDIS_URL.startswith("rediss://"):
        # Use the same URL parsing for TLS credentials, database and query options.
        ri = redis.Redis.from_url(settings.REDIS_URL, db=0, **settings.REDIS_SSL_KWARGS)
    else:
        ri = redis.Redis.from_url(settings.REDIS_URL, db=0)

    return ri


def redis_client():
    """Return the Redis client that application code should use.

    In the test environment this is an in-process fake Redis server, so the
    suite can run without a Redis container. Everywhere else it is the
    configured instance.

    Application code must use this function rather than ``redis_instance()``
    so that both paths see the same data in tests.
    """
    if getattr(settings, "USE_FAKE_REDIS", False):
        from strata.settings.fake_redis_client import get_fake_redis

        return get_fake_redis()

    return redis_instance()
