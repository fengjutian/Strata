# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.db.models import Q

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# drf-spectacular imports

# Module imports
from strata.api.serializers import IssueActivitySerializer
from strata.app.permissions import ProjectEntityPermission
from strata.db.models import Issue, IssueActivity
from strata.utils.openapi import (
    ACTIVITY_ID_PARAMETER,
    CURSOR_PARAMETER,
    EXPAND_PARAMETER,
    FIELDS_PARAMETER,
    INVALID_REQUEST_RESPONSE,
    ISSUE_ID_PARAMETER,
    ISSUE_NOT_FOUND_RESPONSE,
    ORDER_BY_PARAMETER,
    PER_PAGE_PARAMETER,
    create_paginated_response,
    issue_activity_docs,
)
from strata.utils.order_queryset import ACTIVITY_ORDER_BY_ALLOWLIST, sanitize_order_by

from ..base import BaseAPIView
from .permissions import guest_cannot_view_issue


class IssueActivityListAPIEndpoint(BaseAPIView):
    permission_classes = [ProjectEntityPermission]
    use_read_replica = True

    @issue_activity_docs(
        operation_id="list_work_item_activities",
        description="Retrieve all activities for a work item. Supports filtering by activity type and date range.",
        parameters=[
            ISSUE_ID_PARAMETER,
            CURSOR_PARAMETER,
            PER_PAGE_PARAMETER,
            ORDER_BY_PARAMETER,
            FIELDS_PARAMETER,
            EXPAND_PARAMETER,
        ],
        responses={
            200: create_paginated_response(
                IssueActivitySerializer,
                "PaginatedIssueActivityResponse",
                "Paginated list of issue activities",
                "Paginated Issue Activities",
            ),
            400: INVALID_REQUEST_RESPONSE,
            404: ISSUE_NOT_FOUND_RESPONSE,
        },
    )
    def get(self, request, slug, project_id, issue_id):
        """List issue activities

        Retrieve chronological activity logs for an issue.
        Excludes comment, vote, reaction, and draft activities.
        """
        issue = Issue.objects.get(workspace__slug=slug, project_id=project_id, pk=issue_id)
        if guest_cannot_view_issue(request.user.id, issue, slug):
            raise Issue.DoesNotExist()

        issue_activities = (
            IssueActivity.objects.filter(issue_id=issue_id, workspace__slug=slug, project_id=project_id)
            .filter(
                ~Q(field__in=["comment", "vote", "reaction", "draft"]),
                project__project_projectmember__member=self.request.user,
                project__project_projectmember__is_active=True,
            )
            .filter(project__archived_at__isnull=True)
            .select_related("actor", "workspace", "issue", "project")
        ).order_by(
            sanitize_order_by(request.GET.get("order_by", "created_at"), ACTIVITY_ORDER_BY_ALLOWLIST, "created_at")
        )

        return self.paginate(
            request=request,
            queryset=(issue_activities),
            on_results=lambda issue_activity: (
                IssueActivitySerializer(issue_activity, many=True, fields=self.fields, expand=self.expand).data
            ),
        )


class IssueActivityDetailAPIEndpoint(BaseAPIView):
    """Issue Activity Detail Endpoint"""

    permission_classes = [ProjectEntityPermission]
    use_read_replica = True

    @issue_activity_docs(
        operation_id="retrieve_work_item_activity",
        description="Retrieve details of a specific activity.",
        parameters=[
            ISSUE_ID_PARAMETER,
            ACTIVITY_ID_PARAMETER,
            CURSOR_PARAMETER,
            PER_PAGE_PARAMETER,
            ORDER_BY_PARAMETER,
            FIELDS_PARAMETER,
            EXPAND_PARAMETER,
        ],
        responses={
            200: create_paginated_response(
                IssueActivitySerializer,
                "PaginatedIssueActivityDetailResponse",
                "Paginated list of work item activities",
                "Work Item Activity Details",
            ),
            400: INVALID_REQUEST_RESPONSE,
            404: ISSUE_NOT_FOUND_RESPONSE,
        },
    )
    def get(self, request, slug, project_id, issue_id, pk):
        """Retrieve issue activity

        Retrieve details of a specific activity.
        Excludes comment, vote, reaction, and draft activities.
        """
        issue = Issue.objects.get(workspace__slug=slug, project_id=project_id, pk=issue_id)
        if guest_cannot_view_issue(request.user.id, issue, slug):
            raise Issue.DoesNotExist()

        issue_activity = (
            (
                IssueActivity.objects.filter(issue_id=issue_id, workspace__slug=slug, project_id=project_id, id=pk)
                .filter(
                    ~Q(field__in=["comment", "vote", "reaction", "draft"]),
                    project__project_projectmember__member=self.request.user,
                    project__project_projectmember__is_active=True,
                )
                .filter(project__archived_at__isnull=True)
                .select_related("actor", "workspace", "issue", "project")
            )
            .order_by(
                sanitize_order_by(request.GET.get("order_by", "created_at"), ACTIVITY_ORDER_BY_ALLOWLIST, "created_at")
            )
            .first()
        )

        if not issue_activity:
            return Response({"message": "Activity not found.", "code": "NOT_FOUND"}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            IssueActivitySerializer(issue_activity, fields=self.fields, expand=self.expand).data,
            status=status.HTTP_200_OK,
        )
