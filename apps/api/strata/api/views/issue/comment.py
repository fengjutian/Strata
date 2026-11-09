# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
import json

# Django imports
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Exists
from django.utils import timezone

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# drf-spectacular imports
from drf_spectacular.utils import OpenApiRequest, OpenApiResponse

# Module imports
from strata.api.serializers import IssueCommentCreateSerializer, IssueCommentSerializer
from strata.app.permissions import ProjectLitePermission
from strata.db.models import Issue, IssueComment, ProjectMember
from strata.utils.openapi import (
    COMMENT_ID_PARAMETER,
    COMMENT_NOT_FOUND_RESPONSE,
    CURSOR_PARAMETER,
    EXTERNAL_ID_EXISTS_RESPONSE,
    EXPAND_PARAMETER,
    FIELDS_PARAMETER,
    FORBIDDEN_RESPONSE,
    INVALID_REQUEST_RESPONSE,
    ISSUE_COMMENT_CREATE_EXAMPLE,
    ISSUE_COMMENT_EXAMPLE,
    ISSUE_COMMENT_UPDATE_EXAMPLE,
    ISSUE_ID_PARAMETER,
    ISSUE_NOT_FOUND_RESPONSE,
    ORDER_BY_PARAMETER,
    PER_PAGE_PARAMETER,
    create_paginated_response,
    issue_comment_docs,
)

from . import common
from ..base import BaseAPIView
from .permissions import (
    guest_cannot_view_issue,
    is_active_project_member,
    is_project_or_workspace_admin,
)


class IssueCommentListCreateAPIEndpoint(BaseAPIView):
    """Issue Comment List and Create Endpoint"""

    serializer_class = IssueCommentSerializer
    model = IssueComment
    webhook_event = "issue_comment"
    permission_classes = [ProjectLitePermission]
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
            IssueComment.objects.filter(workspace__slug=slug)
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(issue_id=self.kwargs.get("issue_id"))
            .filter(
                project__project_projectmember__member=self.request.user,
                project__project_projectmember__is_active=True,
            )
            .filter(project__archived_at__isnull=True)
            .select_related("workspace", "project", "issue", "actor")
            .annotate(
                is_member=Exists(
                    ProjectMember.objects.filter(
                        workspace__slug=slug,
                        project_id=self.kwargs.get("project_id"),
                        member_id=self.request.user.id,
                        is_active=True,
                    )
                )
            )
            .order_by(self.kwargs.get("order_by", "-created_at"))
            .distinct()
        )

    @issue_comment_docs(
        operation_id="list_work_item_comments",
        description="Retrieve all comments for a work item.",
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
                IssueCommentSerializer,
                "PaginatedIssueCommentResponse",
                "Paginated list of work item comments",
                "Paginated Work Item Comments",
            ),
            404: OpenApiResponse(description="Issue not found"),
        },
    )
    def get(self, request, slug, project_id, issue_id):
        """List work item comments

        Retrieve all comments for a work item.
        """
        return self.paginate(
            request=request,
            queryset=(self.get_queryset()),
            on_results=lambda issue_comments: (
                IssueCommentSerializer(issue_comments, many=True, fields=self.fields, expand=self.expand).data
            ),
        )

    @issue_comment_docs(
        operation_id="create_work_item_comment",
        description="Add a new comment to a work item with HTML content.",
        parameters=[
            ISSUE_ID_PARAMETER,
        ],
        request=OpenApiRequest(
            request=IssueCommentCreateSerializer,
            examples=[ISSUE_COMMENT_CREATE_EXAMPLE],
        ),
        responses={
            201: OpenApiResponse(
                description="Work item comment created successfully",
                response=IssueCommentSerializer,
                examples=[ISSUE_COMMENT_EXAMPLE],
            ),
            400: INVALID_REQUEST_RESPONSE,
            404: ISSUE_NOT_FOUND_RESPONSE,
            409: EXTERNAL_ID_EXISTS_RESPONSE,
        },
    )
    def post(self, request, slug, project_id, issue_id):
        """Create work item comment

        Add a new comment to a work item with HTML content.
        Supports external ID tracking for integration purposes.
        """
        issue = Issue.objects.get(workspace__slug=slug, project_id=project_id, pk=issue_id)
        if guest_cannot_view_issue(request.user.id, issue, slug):
            raise Issue.DoesNotExist()

        # Validation check if the issue already exists
        if (
            request.data.get("external_id")
            and request.data.get("external_source")
            and IssueComment.objects.filter(
                project_id=project_id,
                workspace__slug=slug,
                external_source=request.data.get("external_source"),
                external_id=request.data.get("external_id"),
            ).exists()
        ):
            issue_comment = IssueComment.objects.filter(
                workspace__slug=slug,
                project_id=project_id,
                external_id=request.data.get("external_id"),
                external_source=request.data.get("external_source"),
            ).first()
            return Response(
                {
                    "error": "Work item comment with the same external id and external source already exists",
                    "id": str(issue_comment.id),
                },
                status=status.HTTP_409_CONFLICT,
            )

        serializer = IssueCommentCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(project_id=project_id, issue_id=issue_id, actor=request.user)
            issue_comment = IssueComment.objects.get(pk=serializer.instance.id)

            common.issue_activity.delay(
                type="comment.activity.created",
                requested_data=json.dumps(serializer.data, cls=DjangoJSONEncoder),
                actor_id=str(issue_comment.created_by_id),
                issue_id=str(self.kwargs.get("issue_id")),
                project_id=str(self.kwargs.get("project_id")),
                current_instance=None,
                epoch=int(timezone.now().timestamp()),
            )

            # Send the model activity
            common.model_activity.delay(
                model_name="issue_comment",
                model_id=str(serializer.instance.id),
                requested_data=request.data,
                current_instance=None,
                actor_id=request.user.id,
                slug=slug,
                origin=common.base_host(request=request, is_app=True),
            )

            serializer = IssueCommentSerializer(issue_comment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class IssueCommentDetailAPIEndpoint(BaseAPIView):
    """Work Item Comment Detail Endpoint"""

    serializer_class = IssueCommentSerializer
    model = IssueComment
    webhook_event = "issue_comment"
    permission_classes = [ProjectLitePermission]
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
            IssueComment.objects.filter(workspace__slug=slug)
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(issue_id=self.kwargs.get("issue_id"))
            .filter(
                project__project_projectmember__member=self.request.user,
                project__project_projectmember__is_active=True,
            )
            .filter(project__archived_at__isnull=True)
            .select_related("workspace", "project", "issue", "actor")
            .annotate(
                is_member=Exists(
                    ProjectMember.objects.filter(
                        workspace__slug=slug,
                        project_id=self.kwargs.get("project_id"),
                        member_id=self.request.user.id,
                        is_active=True,
                    )
                )
            )
            .order_by(self.kwargs.get("order_by", "-created_at"))
            .distinct()
        )

    @issue_comment_docs(
        operation_id="retrieve_work_item_comment",
        description="Retrieve details of a specific comment.",
        parameters=[
            ISSUE_ID_PARAMETER,
            COMMENT_ID_PARAMETER,
        ],
        responses={
            200: OpenApiResponse(
                description="Work item comments",
                response=IssueCommentSerializer,
                examples=[ISSUE_COMMENT_EXAMPLE],
            ),
            400: INVALID_REQUEST_RESPONSE,
            404: ISSUE_NOT_FOUND_RESPONSE,
        },
    )
    def get(self, request, slug, project_id, issue_id, pk):
        """Retrieve issue comment

        Retrieve details of a specific comment.
        """
        issue_comment = self.get_queryset().get(pk=pk)
        serializer = IssueCommentSerializer(issue_comment, fields=self.fields, expand=self.expand)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @issue_comment_docs(
        operation_id="update_work_item_comment",
        description="Modify the content of an existing comment on a work item.",
        parameters=[
            ISSUE_ID_PARAMETER,
            COMMENT_ID_PARAMETER,
        ],
        request=OpenApiRequest(
            request=IssueCommentCreateSerializer,
            examples=[ISSUE_COMMENT_UPDATE_EXAMPLE],
        ),
        responses={
            200: OpenApiResponse(
                description="Work item comment updated successfully",
                response=IssueCommentSerializer,
                examples=[ISSUE_COMMENT_EXAMPLE],
            ),
            400: INVALID_REQUEST_RESPONSE,
            403: FORBIDDEN_RESPONSE,
            404: COMMENT_NOT_FOUND_RESPONSE,
            409: EXTERNAL_ID_EXISTS_RESPONSE,
        },
    )
    def patch(self, request, slug, project_id, issue_id, pk):
        """Update work item comment

        Modify the content of an existing comment on a work item.
        Validates external ID uniqueness if provided.
        """
        issue = Issue.objects.get(workspace__slug=slug, project_id=project_id, pk=issue_id)
        # admins (including a workspace admin with a project GUEST role) skip the guest visibility gate
        is_admin = is_project_or_workspace_admin(request.user.id, project_id, slug)
        if not is_admin and guest_cannot_view_issue(request.user.id, issue, slug):
            raise Issue.DoesNotExist()
        issue_comment = IssueComment.objects.get(workspace__slug=slug, project_id=project_id, issue_id=issue_id, pk=pk)
        if not (
            (issue_comment.created_by_id == request.user.id and is_active_project_member(request.user.id, project_id))
            or is_admin
        ):
            return Response(
                {"error": "You are not allowed to edit this comment"},
                status=status.HTTP_403_FORBIDDEN,
            )
        requested_data = json.dumps(self.request.data, cls=DjangoJSONEncoder)
        current_instance = json.dumps(IssueCommentSerializer(issue_comment).data, cls=DjangoJSONEncoder)

        # Validation check if the issue already exists
        if (
            request.data.get("external_id")
            and (issue_comment.external_id != str(request.data.get("external_id")))
            and IssueComment.objects.filter(
                project_id=project_id,
                workspace__slug=slug,
                external_source=request.data.get("external_source", issue_comment.external_source),
                external_id=request.data.get("external_id"),
            ).exists()
        ):
            return Response(
                {
                    "error": "Work item comment with the same external id and external source already exists",
                    "id": str(issue_comment.id),
                },
                status=status.HTTP_409_CONFLICT,
            )

        serializer = IssueCommentCreateSerializer(issue_comment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            common.issue_activity.delay(
                type="comment.activity.updated",
                requested_data=requested_data,
                actor_id=str(request.user.id),
                issue_id=str(issue_id),
                project_id=str(project_id),
                current_instance=current_instance,
                epoch=int(timezone.now().timestamp()),
            )
            # Send the model activity
            common.model_activity.delay(
                model_name="issue_comment",
                model_id=str(pk),
                requested_data=request.data,
                current_instance=current_instance,
                actor_id=request.user.id,
                slug=slug,
                origin=common.base_host(request=request, is_app=True),
            )

            issue_comment = IssueComment.objects.get(pk=serializer.instance.id)
            serializer = IssueCommentSerializer(issue_comment)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @issue_comment_docs(
        operation_id="delete_work_item_comment",
        description="Permanently remove a comment from a work item. Records deletion activity for audit purposes.",
        parameters=[
            ISSUE_ID_PARAMETER,
            COMMENT_ID_PARAMETER,
        ],
        responses={
            204: OpenApiResponse(description="Work item comment deleted successfully"),
            403: FORBIDDEN_RESPONSE,
            404: COMMENT_NOT_FOUND_RESPONSE,
        },
    )
    def delete(self, request, slug, project_id, issue_id, pk):
        """Delete issue comment

        Permanently remove a comment from a work item.
        Records deletion activity for audit purposes.
        """
        issue = Issue.objects.get(workspace__slug=slug, project_id=project_id, pk=issue_id)
        # admins (including a workspace admin with a project GUEST role) skip the guest visibility gate
        is_admin = is_project_or_workspace_admin(request.user.id, project_id, slug)
        if not is_admin and guest_cannot_view_issue(request.user.id, issue, slug):
            raise Issue.DoesNotExist()
        issue_comment = IssueComment.objects.get(workspace__slug=slug, project_id=project_id, issue_id=issue_id, pk=pk)
        if not (
            (issue_comment.created_by_id == request.user.id and is_active_project_member(request.user.id, project_id))
            or is_admin
        ):
            return Response(
                {"error": "You are not allowed to delete this comment"},
                status=status.HTTP_403_FORBIDDEN,
            )
        current_instance = json.dumps(IssueCommentSerializer(issue_comment).data, cls=DjangoJSONEncoder)
        issue_comment.delete()
        common.issue_activity.delay(
            type="comment.activity.deleted",
            requested_data=json.dumps({"comment_id": str(pk)}),
            actor_id=str(request.user.id),
            issue_id=str(issue_id),
            project_id=str(project_id),
            current_instance=current_instance,
            epoch=int(timezone.now().timestamp()),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
