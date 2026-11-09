# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Shared side-effect symbols for the work item API views.

`issue_activity`, `model_activity` and `base_host` are used by more than one
module in this package. They live here so that there is a single binding to
patch in tests -- modules reference them as `common.<symbol>` at call time, so
patching `strata.api.views.issue.common.<symbol>` affects every caller.

Do not import these symbols directly from their definition modules in the
sibling view modules; that reintroduces the per-module binding this module
exists to remove.
"""

# Module imports
from strata.bgtasks.issue_activities_task import issue_activity
from strata.bgtasks.webhook_task import model_activity
from strata.utils.host import base_host

__all__ = [
    "base_host",
    "issue_activity",
    "model_activity",
]
