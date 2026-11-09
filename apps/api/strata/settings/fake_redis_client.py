# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""A django_redis client backed by an in-process fake Redis server.

The test suite uses ``cache.delete_pattern(...)``, which is a django_redis
extension rather than a plain Redis command. Replacing the cache backend
with Django's LocMemCache is therefore not an option -- it has no such
method -- and the tests fail during setup.

This client keeps the django_redis backend (so ``delete_pattern`` and the
rest of its API keep working) while serving the data from an in-process
fake Redis server, so the suite runs without a Redis container.

It is only used by ``strata.settings.test`` when no Redis server is
reachable.
"""

from __future__ import annotations

import threading

import fakeredis
from django_redis.client.default import DefaultClient

_server = None
_server_lock = threading.Lock()


def get_fake_server():
    """Return the process-wide fake Redis server, creating it on first use.

    The server is shared so that every client in the process -- the cache
    backend and the direct ``redis_instance()`` callers alike -- sees the
    same data, exactly like a real Redis server.
    """
    global _server
    if _server is None:
        with _server_lock:
            if _server is None:
                _server = fakeredis.FakeServer()
    return _server


def get_fake_redis(db: int = 0):
    """Return a Redis client bound to the shared fake server."""
    return fakeredis.FakeRedis(server=get_fake_server(), db=db)


class FakeRedisClient(DefaultClient):
    """django_redis client that talks to an in-process fake Redis server."""

    def connect(self, index: int = 0):
        """Return a client bound to the fake server instead of a socket."""
        # The database number is encoded in the LOCATION string. fakeredis
        # keys its databases on the shared server, so it has to match the
        # one the production configuration would use.
        db = 0
        location = self._server[index] if index < len(self._server) else self._server[0]
        try:
            db = int(location.rsplit("/", 1)[-1])
        except (IndexError, ValueError):
            db = 0
        return get_fake_redis(db=db)
