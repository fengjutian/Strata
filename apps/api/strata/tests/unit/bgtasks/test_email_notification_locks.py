# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Unit tests for the notification task's Redis lock helpers.

`acquire_lock` and `release_lock` are the only guard around the notification
processing loop, and they were previously untested. A regression here (for
example a local variable shadowing the `redis_client` accessor, which
produces a self-assignment and an UnboundLocalError at call time) would only
surface in production, on the worker.
"""

from unittest import mock

import pytest


@pytest.mark.unit
class TestNotificationLocks:
    def test_acquire_lock_sets_the_key_only_when_absent(self):
        from strata.bgtasks import email_notification_task

        client = mock.MagicMock()
        client.set.return_value = True

        with mock.patch.object(email_notification_task, "redis_client", return_value=client):
            acquired = email_notification_task.acquire_lock("lock-1", expire_time=60)

        assert acquired is True
        client.set.assert_called_once_with("lock-1", "true", nx=True, ex=60)

    def test_acquire_lock_returns_false_when_the_key_exists(self):
        from strata.bgtasks import email_notification_task

        client = mock.MagicMock()
        client.set.return_value = False

        with mock.patch.object(email_notification_task, "redis_client", return_value=client):
            acquired = email_notification_task.acquire_lock("lock-1")

        assert acquired is False

    def test_release_lock_deletes_the_key(self):
        from strata.bgtasks import email_notification_task

        client = mock.MagicMock()

        with mock.patch.object(email_notification_task, "redis_client", return_value=client):
            email_notification_task.release_lock("lock-1")

        client.delete.assert_called_once_with("lock-1")

    def test_helpers_use_the_shared_accessor_rather_than_a_shadowing_local(self):
        """A local named like the accessor would shadow it and raise at call time."""
        from strata.bgtasks import email_notification_task

        client = mock.MagicMock()
        client.set.return_value = True

        with mock.patch.object(email_notification_task, "redis_client", return_value=client):
            # The accessor must be reachable; a shadowing local would make
            # this raise UnboundLocalError instead of returning the mock.
            assert email_notification_task.redis_client() is client
            assert email_notification_task.acquire_lock("lock-1") is True
            email_notification_task.release_lock("lock-1")

        client.set.assert_called_once()
        client.delete.assert_called_once_with("lock-1")
