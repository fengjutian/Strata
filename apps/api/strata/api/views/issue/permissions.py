# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.db.models import Q

# Module imports
from strata.app.permissions import ROLE
from strata.db.models import ProjectMember, WorkspaceMember


def user_has_issue_permission(user_id, project_id, issue=None, allowed_roles=None, allow_creator=True):
    if allow_creator and issue is not None and user_id == issue.created_by_id:
        return True

    qs = ProjectMember.objects.filter(
        project_id=project_id,
        member_id=user_id,
        is_active=True,
    )
    if allowed_roles is not None:
        qs = qs.filter(role__in=allowed_roles)

    return qs.exists()


def is_active_project_member(user_id, project_id):
    return ProjectMember.objects.filter(project_id=project_id, member_id=user_id, is_active=True).exists()


def is_project_or_workspace_admin(user_id, project_id, slug):
    """An active project admin, or a workspace admin who is an active project
    member (the admin rule of the app's `allow_permission`)."""
    project_member = ProjectMember.objects.filter(
        workspace__slug=slug, project_id=project_id, member_id=user_id, is_active=True
    ).first()
    return project_member is not None and (
        project_member.role == ROLE.ADMIN.value
        or WorkspaceMember.objects.filter(
            workspace__slug=slug, member_id=user_id, role=ROLE.ADMIN.value, is_active=True
        ).exists()
    )


def is_restricted_guest(user_id, project_id, slug):
    """A "restricted guest" holds the GUEST role on a project that has not
    enabled `guest_view_all_features`, and may only see work items they
    created (mirrors `IssueViewSet.list`/`.retrieve` in app/views/issue)."""
    return ProjectMember.objects.filter(
        workspace__slug=slug,
        project_id=project_id,
        member_id=user_id,
        is_active=True,
        role=ROLE.GUEST.value,
        project__guest_view_all_features=False,
    ).exists()


def guest_cannot_view_issue(user_id, issue, slug):
    """True when `issue` exists but a restricted guest did not create it.
    Callers deny the whole request with 404, the same response as a missing
    issue."""
    return issue is not None and issue.created_by_id != user_id and is_restricted_guest(user_id, issue.project_id, slug)


def visible_issue_q(user):
    """Issue filter for work items `user` may view, across projects: every
    issue in a project where they are an active member above GUEST or a GUEST
    with `guest_view_all_features`, otherwise only the issues they created."""
    return (
        Q(
            project__project_projectmember__member=user,
            project__project_projectmember__is_active=True,
            project__project_projectmember__role__gt=ROLE.GUEST.value,
        )
        | Q(
            project__project_projectmember__member=user,
            project__project_projectmember__is_active=True,
            project__project_projectmember__role=ROLE.GUEST.value,
            project__guest_view_all_features=True,
        )
        | Q(
            project__project_projectmember__member=user,
            project__project_projectmember__is_active=True,
            project__project_projectmember__role=ROLE.GUEST.value,
            project__guest_view_all_features=False,
            created_by=user,
        )
    )
