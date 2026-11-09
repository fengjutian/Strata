# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Re-export the public surface of the work item API views.
# `from strata.api.views.issue import X` and `from .issue import X`
# must keep working after the split.
from .activity import (
    IssueActivityDetailAPIEndpoint,
    IssueActivityListAPIEndpoint,
)
from .attachment import (
    IssueAttachmentDetailAPIEndpoint,
    IssueAttachmentListCreateAPIEndpoint,
)
from .comment import (
    IssueCommentDetailAPIEndpoint,
    IssueCommentListCreateAPIEndpoint,
)
from .label import LabelDetailAPIEndpoint, LabelListCreateAPIEndpoint
from .link import IssueLinkDetailAPIEndpoint, IssueLinkListCreateAPIEndpoint
from .permissions import (
    guest_cannot_view_issue,
    is_active_project_member,
    is_project_or_workspace_admin,
    is_restricted_guest,
    user_has_issue_permission,
    visible_issue_q,
)
from .relation import IssueRelationListCreateAPIEndpoint
from .search import IssueSearchEndpoint
from .work_item import (
    IssueDetailAPIEndpoint,
    IssueListCreateAPIEndpoint,
    WorkspaceIssueAPIEndpoint,
)

__all__ = [
    "WorkspaceIssueAPIEndpoint",
    "IssueListCreateAPIEndpoint",
    "IssueDetailAPIEndpoint",
    "LabelListCreateAPIEndpoint",
    "LabelDetailAPIEndpoint",
    "IssueLinkListCreateAPIEndpoint",
    "IssueLinkDetailAPIEndpoint",
    "IssueCommentListCreateAPIEndpoint",
    "IssueCommentDetailAPIEndpoint",
    "IssueActivityListAPIEndpoint",
    "IssueActivityDetailAPIEndpoint",
    "IssueAttachmentListCreateAPIEndpoint",
    "IssueAttachmentDetailAPIEndpoint",
    "IssueSearchEndpoint",
    "IssueRelationListCreateAPIEndpoint",
    "user_has_issue_permission",
    "is_active_project_member",
    "is_project_or_workspace_admin",
    "is_restricted_guest",
    "guest_cannot_view_issue",
    "visible_issue_q",
]
