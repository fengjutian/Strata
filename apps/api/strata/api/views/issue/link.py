# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
import json

# Django imports
from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# drf-spectacular imports
from drf_spectacular.utils import OpenApiRequest, OpenApiResponse

# Module imports
from strata.api.serializers import (
    IssueLinkCreateSerializer,
    IssueLinkSerializer,
    IssueLinkUpdateSerializer,
)
from strata.app.permissions import ProjectEntityPermission
from strata.bgtasks.work_item_link_task import crawl_work_item_link_title
from strata.db.models import Issue, IssueLink
from strata.utils.openapi import (
    CURSOR_PARAMETER,
    EXPAND_PARAMETER,
    FIELDS_PARAMETER,
    INVALID_REQUEST_RESPONSE,
    ISSUE_ID_PARAMETER,
    ISSUE_LINK_CREATE_EXAMPLE,
    ISSUE_LINK_EXAMPLE,
    ISSUE_LINK_UPDATE_EXAMPLE,
    ISSUE_NOT_FOUND_RESPONSE,
    LINK_ID_PARAMETER,
    LINK_NOT_FOUND_RESPONSE,
    ORDER_BY_PARAMETER,
    PER_PAGE_PARAMETER,
    create_paginated_response,
    issue_link_docs,
)

from . import common
from ..base import BaseAPIView
from .permissions import guest_cannot_view_issue


class IssueLinkListCreateAPIEndpoint(BaseAPIView):
    """Work Item Link List and Create Endpoint"""

    serializer_class = IssueLinkSerializer
    model = IssueLink
    permission_classes = [ProjectEntityPermission]
    use_read_replica = True

    def get_queryset(self):
        slug = self.kwargs.get("slug")
        issue = Issue.objects.get(
            workspace__slug=slug,
            project_id=self.kwargs.get("project_id"),
            pk=self.kwargs.get("issue_id"),
        )
        if guest_cannot_view_issue(self.request.user.id, issue, slug):
            raise Issue.DoesNotExist()
        return (
            IssueLink.objects.filter(workspace__slug=slug)
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(issue_id=self.kwargs.get("issue_id"))
            .filter(
                project__project_projectmember__member=self.request.user,
                project__project_projectmember__is_active=True,
            )
            .filter(project__archived_at__isnull=True)
            .order_by(self.kwargs.get("order_by", "-created_at"))
            .distinct()
        )

    @issue_link_docs(
        operation_id="list_work_item_links",
        description="Retrieve all links associated with a work item. Supports filtering by URL, title, and metadata.",
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
                IssueLinkSerializer,
                "PaginatedIssueLinkResponse",
                "Paginated list of work item links",
                "Paginated Work Item Links",
            ),
            400: INVALID_REQUEST_RESPONSE,
            404: ISSUE_NOT_FOUND_RESPONSE,
        },
    )
    def get(self, request, slug, project_id, issue_id):
        """List work item links

        Retrieve all links associated with a work item.
        """
        return self.paginate(
            request=request,
            queryset=(self.get_queryset()),
            on_results=lambda issue_links: (
                IssueLinkSerializer(issue_links, many=True, fields=self.fields, expand=self.expand).data
            ),
        )

    @issue_link_docs(
        operation_id="create_work_item_link",
        description="Add a new external link to a work item with URL, title, and metadata.",
        parameters=[
            ISSUE_ID_PARAMETER,
        ],
        request=OpenApiRequest(
            request=IssueLinkCreateSerializer,
            examples=[ISSUE_LINK_CREATE_EXAMPLE],
        ),
        responses={
            201: OpenApiResponse(
                description="Work item link created successfully",
                response=IssueLinkSerializer,
                examples=[ISSUE_LINK_EXAMPLE],
            ),
            400: INVALID_REQUEST_RESPONSE,
            404: ISSUE_NOT_FOUND_RESPONSE,
        },
    )
    def post(self, request, slug, project_id, issue_id):
        """Create issue link

        Add a new external link to a work item with URL, title, and metadata.
        Automatically tracks link creation activity.
        """
        Issue.objects.get(workspace__slug=slug, project_id=project_id, pk=issue_id)
        serializer = IssueLinkCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(project_id=project_id, issue_id=issue_id)
            crawl_work_item_link_title.delay(serializer.instance.id, serializer.instance.url)
            link = IssueLink.objects.get(pk=serializer.instance.id)
            common.issue_activity.delay(
                type="link.activity.created",
                requested_data=json.dumps(serializer.data, cls=DjangoJSONEncoder),
                issue_id=str(self.kwargs.get("issue_id")),
                project_id=str(self.kwargs.get("project_id")),
                actor_id=str(link.created_by_id),
                current_instance=None,
                epoch=int(timezone.now().timestamp()),
            )
            serializer = IssueLinkSerializer(link)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class IssueLinkDetailAPIEndpoint(BaseAPIView):
    """Issue Link Detail Endpoint"""

    permission_classes = [ProjectEntityPermission]

    model = IssueLink
    serializer_class = IssueLinkSerializer
    use_read_replica = True

    def get_queryset(self):
        slug = self.kwargs.get("slug")
        issue = Issue.objects.get(
            workspace__slug=slug,
            project_id=self.kwargs.get("project_id"),
            pk=self.kwargs.get("issue_id"),
        )
        if guest_cannot_view_issue(self.request.user.id, issue, slug):
            raise Issue.DoesNotExist()
        return (
            IssueLink.objects.filter(workspace__slug=slug)
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(issue_id=self.kwargs.get("issue_id"))
            .filter(
                project__project_projectmember__member=self.request.user,
                project__project_projectmember__is_active=True,
            )
            .filter(project__archived_at__isnull=True)
            .order_by(self.kwargs.get("order_by", "-created_at"))
            .distinct()
        )

    @issue_link_docs(
        operation_id="retrieve_work_item_link",
        description="Retrieve details of a specific work item link.",
        parameters=[
            ISSUE_ID_PARAMETER,
            LINK_ID_PARAMETER,
            CURSOR_PARAMETER,
            PER_PAGE_PARAMETER,
            FIELDS_PARAMETER,
            EXPAND_PARAMETER,
        ],
        responses={
            200: create_paginated_response(
                IssueLinkSerializer,
                "PaginatedIssueLinkDetailResponse",
                "Work item link details or paginated list",
                "Work Item Link Details",
            ),
            404: OpenApiResponse(description="Issue not found"),
        },
    )
    def get(self, request, slug, project_id, issue_id, pk):
        """Retrieve work item link

        Retrieve details of a specific work item link.
        """
        if pk is None:
            issue_links = self.get_queryset()
            serializer = IssueLinkSerializer(issue_links, fields=self.fields, expand=self.expand)
            return self.paginate(
                request=request,
                queryset=(self.get_queryset()),
                on_results=lambda issue_links: (
                    IssueLinkSerializer(issue_links, many=True, fields=self.fields, expand=self.expand).data
                ),
            )
        issue_link = self.get_queryset().get(pk=pk)
        serializer = IssueLinkSerializer(issue_link, fields=self.fields, expand=self.expand)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @issue_link_docs(
        operation_id="update_issue_link",
        description="Modify the URL, title, or metadata of an existing issue link.",
        parameters=[
            ISSUE_ID_PARAMETER,
            LINK_ID_PARAMETER,
        ],
        request=OpenApiRequest(
            request=IssueLinkUpdateSerializer,
            examples=[ISSUE_LINK_UPDATE_EXAMPLE],
        ),
        responses={
            200: OpenApiResponse(
                description="Issue link updated successfully",
                response=IssueLinkSerializer,
                examples=[ISSUE_LINK_EXAMPLE],
            ),
            400: INVALID_REQUEST_RESPONSE,
            404: LINK_NOT_FOUND_RESPONSE,
        },
    )
    def patch(self, request, slug, project_id, issue_id, pk):
        """Update issue link

        Modify the URL, title, or metadata of an existing issue link.
        Tracks all changes in issue activity logs.
        """
        issue_link = IssueLink.objects.get(workspace__slug=slug, project_id=project_id, issue_id=issue_id, pk=pk)
        requested_data = json.dumps(request.data, cls=DjangoJSONEncoder)
        current_instance = json.dumps(IssueLinkSerializer(issue_link).data, cls=DjangoJSONEncoder)
        previous_url = issue_link.url
        serializer = IssueLinkSerializer(issue_link, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            updated_url = serializer.data.get("url")
            if updated_url and updated_url != previous_url:
                crawl_work_item_link_title.delay(serializer.data.get("id"), updated_url)
            common.issue_activity.delay(
                type="link.activity.updated",
                requested_data=requested_data,
                actor_id=str(request.user.id),
                issue_id=str(issue_id),
                project_id=str(project_id),
                current_instance=current_instance,
                epoch=int(timezone.now().timestamp()),
            )
            serializer = IssueLinkSerializer(issue_link)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @issue_link_docs(
        operation_id="delete_work_item_link",
        description="Permanently remove an external link from a work item.",
        parameters=[
            ISSUE_ID_PARAMETER,
            LINK_ID_PARAMETER,
        ],
        responses={
            204: OpenApiResponse(description="Work item link deleted successfully"),
            404: OpenApiResponse(description="Work item link not found"),
        },
    )
    def delete(self, request, slug, project_id, issue_id, pk):
        """Delete work item link

        Permanently remove an external link from a work item.
        Records deletion activity for audit purposes.
        """
        issue_link = IssueLink.objects.get(workspace__slug=slug, project_id=project_id, issue_id=issue_id, pk=pk)
        current_instance = json.dumps(IssueLinkSerializer(issue_link).data, cls=DjangoJSONEncoder)
        common.issue_activity.delay(
            type="link.activity.deleted",
            requested_data=json.dumps({"link_id": str(pk)}),
            actor_id=str(request.user.id),
            issue_id=str(issue_id),
            project_id=str(project_id),
            current_instance=current_instance,
            epoch=int(timezone.now().timestamp()),
        )
        issue_link.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
