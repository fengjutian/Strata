# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
import json

# Django imports
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import (
    Case,
    CharField,
    F,
    Func,
    Max,
    OuterRef,
    Subquery,
    Value,
    When,
)
from django.utils import timezone

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# drf-spectacular imports
from drf_spectacular.utils import (
    OpenApiRequest,
    OpenApiResponse,
    extend_schema,
)

# Module imports
from strata.api.serializers import IssueSerializer
from strata.app.permissions import ProjectEntityPermission
from strata.db.models import CycleIssue, FileAsset, Issue, IssueLink, Project, ProjectMember
from strata.utils.openapi import (
    ADMIN_ONLY_RESPONSE,
    CURSOR_PARAMETER,
    DELETED_RESPONSE,
    EXTERNAL_ID_EXISTS_RESPONSE,
    EXTERNAL_ID_PARAMETER,
    EXTERNAL_SOURCE_PARAMETER,
    EXPAND_PARAMETER,
    FIELDS_PARAMETER,
    INVALID_REQUEST_RESPONSE,
    ISSUE_CREATE_EXAMPLE,
    ISSUE_EXAMPLE,
    ISSUE_IDENTIFIER_PARAMETER,
    ISSUE_UPDATE_EXAMPLE,
    ISSUE_UPSERT_EXAMPLE,
    ORDER_BY_PARAMETER,
    PER_PAGE_PARAMETER,
    PROJECT_ID_PARAMETER,
    PROJECT_IDENTIFIER_PARAMETER,
    PROJECT_NOT_FOUND_RESPONSE,
    WORKSPACE_SLUG_PARAMETER,
    WORK_ITEM_NOT_FOUND_RESPONSE,
    create_paginated_response,
    work_item_docs,
)
from strata.utils.order_queryset import ISSUE_ORDER_BY_ALLOWLIST, sanitize_order_by
from strata.utils.serializers import writable_data

from . import common
from ..base import BaseAPIView
from .permissions import guest_cannot_view_issue, is_restricted_guest


class WorkspaceIssueAPIEndpoint(BaseAPIView):
    """
    This viewset provides `retrieveByIssueId` on workspace level

    """

    model = Issue
    webhook_event = "issue"
    permission_classes = [ProjectEntityPermission]
    serializer_class = IssueSerializer
    use_read_replica = True

    @property
    def project_identifier(self):
        return self.kwargs.get("project_identifier", None)

    def get_queryset(self):
        return (
            Issue.issue_objects.annotate(
                sub_issues_count=Issue.issue_objects.filter(parent=OuterRef("id"))
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .filter(workspace__slug=self.kwargs.get("slug"))
            .filter(project__identifier=self.kwargs.get("project_identifier"))
            .select_related("project")
            .select_related("workspace")
            .select_related("state")
            .select_related("parent")
            .prefetch_related("assignees")
            .prefetch_related("labels")
            .order_by(self.kwargs.get("order_by", "-created_at"))
        ).distinct()

    @extend_schema(
        operation_id="get_workspace_work_item",
        summary="Retrieve work item by identifiers",
        description="Retrieve a specific work item using workspace slug, project identifier, and issue identifier.",
        tags=["Work Items"],
        parameters=[
            WORKSPACE_SLUG_PARAMETER,
            PROJECT_IDENTIFIER_PARAMETER,
            ISSUE_IDENTIFIER_PARAMETER,
        ],
        responses={
            200: OpenApiResponse(
                description="Work item details",
                response=IssueSerializer,
                examples=[ISSUE_EXAMPLE],
            ),
            404: WORK_ITEM_NOT_FOUND_RESPONSE,
        },
    )
    def get(self, request, slug, project_identifier=None, issue_identifier=None):
        """Retrieve work item by identifiers

        Retrieve a specific work item using workspace slug, project identifier, and issue identifier.
        This endpoint provides workspace-level access to work items.
        """
        if issue_identifier and project_identifier:
            # The `<project_identifier>-<issue_identifier>` route also matches UUIDs;
            # sequence_id is an integer, so anything else can't be a work item here.
            if not issue_identifier.isdecimal():
                return Response({"error": "Work item not found"}, status=status.HTTP_404_NOT_FOUND)
            issue = Issue.issue_objects.annotate(
                sub_issues_count=Issue.issue_objects.filter(parent=OuterRef("id"))
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            ).get(
                workspace__slug=slug,
                project__identifier=project_identifier,
                sequence_id=issue_identifier,
            )
            if guest_cannot_view_issue(request.user.id, issue, slug):
                raise Issue.DoesNotExist()
            return Response(
                IssueSerializer(issue, fields=self.fields, expand=self.expand).data,
                status=status.HTTP_200_OK,
            )


class IssueListCreateAPIEndpoint(BaseAPIView):
    """
    This viewset provides `list` and `create` on issue level
    """

    model = Issue
    webhook_event = "issue"
    permission_classes = [ProjectEntityPermission]
    serializer_class = IssueSerializer
    use_read_replica = True

    def get_queryset(self):
        return (
            Issue.issue_objects.annotate(
                sub_issues_count=Issue.issue_objects.filter(parent=OuterRef("id"))
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(workspace__slug=self.kwargs.get("slug"))
            .select_related("project")
            .select_related("workspace")
            .select_related("state")
            .select_related("parent")
            .prefetch_related("assignees")
            .prefetch_related("labels")
            .order_by(self.kwargs.get("order_by", "-created_at"))
        ).distinct()

    @work_item_docs(
        operation_id="list_work_items",
        summary="List work items",
        description="Retrieve a paginated list of all work items in a project. Supports filtering, ordering, and field selection through query parameters.",  # noqa: E501
        parameters=[
            CURSOR_PARAMETER,
            PER_PAGE_PARAMETER,
            EXTERNAL_ID_PARAMETER,
            EXTERNAL_SOURCE_PARAMETER,
            ORDER_BY_PARAMETER,
            FIELDS_PARAMETER,
            EXPAND_PARAMETER,
        ],
        responses={
            200: create_paginated_response(
                IssueSerializer,
                "PaginatedWorkItemResponse",
                "Paginated list of work items",
                "Paginated Work Items",
            ),
            400: INVALID_REQUEST_RESPONSE,
            404: PROJECT_NOT_FOUND_RESPONSE,
        },
    )
    def get(self, request, slug, project_id):
        """List work items

        Retrieve a paginated list of all work items in a project.
        Supports filtering, ordering, and field selection through query parameters.
        """

        unsupported_filters = [param for param in ("pql", "filters") if request.GET.get(param)]
        if unsupported_filters:
            return Response(
                {
                    "pql": (
                        "PQL and structured filters are not supported on this Strata edition. "
                        "Remove the pql/filters parameter and filter results client-side, or use "
                        "a Strata edition that supports work item query filtering."
                    ),
                    "unsupported_parameters": unsupported_filters,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        external_id = request.GET.get("external_id")
        external_source = request.GET.get("external_source")

        if external_id and external_source:
            issue = Issue.objects.get(
                external_id=external_id,
                external_source=external_source,
                workspace__slug=slug,
                project_id=project_id,
            )
            if guest_cannot_view_issue(request.user.id, issue, slug):
                raise Issue.DoesNotExist()
            return Response(
                IssueSerializer(issue, fields=self.fields, expand=self.expand).data,
                status=status.HTTP_200_OK,
            )

        # Restricted guests (GUEST role, guest_view_all_features disabled) may
        # only see work items they created -- mirrors IssueViewSet.list.
        restricted_guest = is_restricted_guest(request.user.id, project_id, slug)

        # Custom ordering for priority and state
        priority_order = ["urgent", "high", "medium", "low", "none"]
        state_order = ["backlog", "unstarted", "started", "completed", "cancelled"]

        # Reject any field not in the allowlist before it reaches .order_by().
        # An unrecognised value is replaced with the safe default, preventing
        # ORM order_by injection via relational traversal (GHSA-p885-6jpg-cr2p).
        order_by_param = sanitize_order_by(
            request.GET.get("order_by", "-created_at"),
            ISSUE_ORDER_BY_ALLOWLIST,
            default="-created_at",
        )

        issue_queryset = (
            self.get_queryset()
            .annotate(
                cycle_id=Subquery(
                    CycleIssue.objects.filter(issue=OuterRef("id"), deleted_at__isnull=True).values("cycle_id")[:1]
                )
            )
            .annotate(
                link_count=IssueLink.objects.filter(issue=OuterRef("id"))
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .annotate(
                attachment_count=FileAsset.objects.filter(
                    issue_id=OuterRef("id"),
                    entity_type=FileAsset.EntityTypeContext.ISSUE_ATTACHMENT,
                )
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
        )

        total_issue_queryset = Issue.issue_objects.filter(project_id=project_id, workspace__slug=slug)

        if restricted_guest:
            issue_queryset = issue_queryset.filter(created_by=request.user)
            total_issue_queryset = total_issue_queryset.filter(created_by=request.user)

        # Priority Ordering
        if order_by_param == "priority" or order_by_param == "-priority":
            priority_order = priority_order if order_by_param == "priority" else priority_order[::-1]
            issue_queryset = issue_queryset.annotate(
                priority_order=Case(
                    *[When(priority=p, then=Value(i)) for i, p in enumerate(priority_order)],
                    output_field=CharField(),
                )
            ).order_by("priority_order")

        # State Ordering
        elif order_by_param in [
            "state__name",
            "state__group",
            "-state__name",
            "-state__group",
        ]:
            state_order = state_order if order_by_param in ["state__name", "state__group"] else state_order[::-1]
            issue_queryset = issue_queryset.annotate(
                state_order=Case(
                    *[When(state__group=state_group, then=Value(i)) for i, state_group in enumerate(state_order)],
                    default=Value(len(state_order)),
                    output_field=CharField(),
                )
            ).order_by("state_order")
        # assignee and label ordering
        elif order_by_param in [
            "labels__name",
            "-labels__name",
            "assignees__first_name",
            "-assignees__first_name",
        ]:
            issue_queryset = issue_queryset.annotate(
                max_values=Max(order_by_param[1::] if order_by_param.startswith("-") else order_by_param)
            ).order_by("-max_values" if order_by_param.startswith("-") else "max_values")
        else:
            issue_queryset = issue_queryset.order_by(order_by_param)

        return self.paginate(
            request=request,
            queryset=(issue_queryset),
            total_count_queryset=total_issue_queryset,
            on_results=lambda issues: IssueSerializer(issues, many=True, fields=self.fields, expand=self.expand).data,
        )

    @work_item_docs(
        operation_id="create_work_item",
        summary="Create work item",
        description="Create a new work item in the specified project with the provided details.",
        request=OpenApiRequest(
            request=IssueSerializer,
            examples=[ISSUE_CREATE_EXAMPLE],
        ),
        responses={
            201: OpenApiResponse(
                description="Work Item created successfully",
                response=IssueSerializer,
                examples=[ISSUE_EXAMPLE],
            ),
            400: INVALID_REQUEST_RESPONSE,
            404: PROJECT_NOT_FOUND_RESPONSE,
            409: EXTERNAL_ID_EXISTS_RESPONSE,
        },
    )
    def post(self, request, slug, project_id):
        """Create work item

        Create a new work item in the specified project with the provided details.
        Supports external ID tracking for integration purposes.
        """
        project = Project.objects.get(pk=project_id)

        serializer = IssueSerializer(
            data=request.data,
            context={
                "project_id": project_id,
                "workspace_id": project.workspace_id,
                "default_assignee_id": project.default_assignee_id,
            },
        )

        if serializer.is_valid():
            if (
                request.data.get("external_id")
                and request.data.get("external_source")
                and Issue.objects.filter(
                    project_id=project_id,
                    workspace__slug=slug,
                    external_source=request.data.get("external_source"),
                    external_id=request.data.get("external_id"),
                ).exists()
            ):
                issue = Issue.objects.filter(
                    workspace__slug=slug,
                    project_id=project_id,
                    external_id=request.data.get("external_id"),
                    external_source=request.data.get("external_source"),
                ).first()
                return Response(
                    {
                        "error": "Issue with the same external id and external source already exists",
                        "id": str(issue.id),
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            serializer.save()

            # Track the issue
            common.issue_activity.delay(
                type="issue.activity.created",
                requested_data=json.dumps(self.request.data, cls=DjangoJSONEncoder),
                actor_id=str(request.user.id),
                issue_id=str(serializer.data.get("id", None)),
                project_id=str(project_id),
                current_instance=None,
                epoch=int(timezone.now().timestamp()),
                notification=True,
                origin=common.base_host(request=request, is_app=True),
            )

            # Send the model activity
            common.model_activity.delay(
                model_name="issue",
                model_id=str(serializer.data["id"]),
                requested_data=request.data,
                current_instance=None,
                actor_id=request.user.id,
                slug=slug,
                origin=common.base_host(request=request, is_app=True),
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class IssueDetailAPIEndpoint(BaseAPIView):
    """Issue Detail Endpoint"""

    model = Issue
    webhook_event = "issue"
    permission_classes = [ProjectEntityPermission]
    serializer_class = IssueSerializer
    use_read_replica = True

    def get_queryset(self):
        return (
            Issue.issue_objects.annotate(
                sub_issues_count=Issue.issue_objects.filter(parent=OuterRef("id"))
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(workspace__slug=self.kwargs.get("slug"))
            .select_related("project")
            .select_related("workspace")
            .select_related("state")
            .select_related("parent")
            .prefetch_related("assignees")
            .prefetch_related("labels")
            .order_by(self.kwargs.get("order_by", "-created_at"))
        ).distinct()

    @work_item_docs(
        operation_id="retrieve_work_item",
        summary="Retrieve work item",
        description="Retrieve details of a specific work item.",
        parameters=[
            PROJECT_ID_PARAMETER,
            EXTERNAL_ID_PARAMETER,
            EXTERNAL_SOURCE_PARAMETER,
            ORDER_BY_PARAMETER,
            FIELDS_PARAMETER,
            EXPAND_PARAMETER,
        ],
        responses={
            200: OpenApiResponse(
                description="List of issues or issue details",
                response=IssueSerializer,
                examples=[ISSUE_EXAMPLE],
            ),
            400: INVALID_REQUEST_RESPONSE,
            404: WORK_ITEM_NOT_FOUND_RESPONSE,
        },
    )
    def get(self, request, slug, project_id, pk):
        """Retrieve work item

        Retrieve details of a specific work item.
        Supports filtering, ordering, and field selection through query parameters.
        """

        issue = Issue.issue_objects.annotate(
            sub_issues_count=Issue.issue_objects.filter(parent=OuterRef("id"))
            .order_by()
            .annotate(count=Func(F("id"), function="Count"))
            .values("count")
        ).get(workspace__slug=slug, project_id=project_id, pk=pk)
        if guest_cannot_view_issue(request.user.id, issue, slug):
            raise Issue.DoesNotExist()
        return Response(
            IssueSerializer(issue, fields=self.fields, expand=self.expand).data,
            status=status.HTTP_200_OK,
        )

    @work_item_docs(
        operation_id="put_work_item",
        summary="Update or create work item",
        description="Update an existing work item identified by external ID and source, or create a new one if it doesn't exist. Requires external_id and external_source parameters for identification.",  # noqa: E501
        request=OpenApiRequest(
            request=IssueSerializer,
            examples=[ISSUE_UPSERT_EXAMPLE],
        ),
        responses={
            200: OpenApiResponse(
                description="Work Item updated successfully",
                response=IssueSerializer,
                examples=[ISSUE_EXAMPLE],
            ),
            201: OpenApiResponse(
                description="Work Item created successfully",
                response=IssueSerializer,
                examples=[ISSUE_EXAMPLE],
            ),
            400: INVALID_REQUEST_RESPONSE,
            404: WORK_ITEM_NOT_FOUND_RESPONSE,
        },
    )
    def put(self, request, slug, project_id):
        """Update or create work item

        Update an existing work item identified by external ID and source, or create a new one if it doesn't exist.
        Requires external_id and external_source parameters for identification.
        """
        # Get the entities required for putting the issue, external_id and
        # external_source are must to identify the issue here
        project = Project.objects.get(pk=project_id)
        external_id = request.data.get("external_id")
        external_source = request.data.get("external_source")

        # If the external_id and source are present, we need to find the exact
        # issue that needs to be updated with the provided external_id and
        # external_source
        if external_id and external_source:
            try:
                issue = Issue.objects.get(
                    project_id=project_id,
                    workspace__slug=slug,
                    external_id=external_id,
                    external_source=external_source,
                )

                # Get the current instance of the issue in order to track
                # changes and dispatch the issue activity
                current_instance = json.dumps(IssueSerializer(issue).data, cls=DjangoJSONEncoder)

                # Pass the requested data to the serializer for validation
                serializer = IssueSerializer(
                    issue,
                    data=request.data,
                    context={
                        "project_id": project_id,
                        "workspace_id": project.workspace_id,
                    },
                    partial=True,
                )
                if serializer.is_valid():
                    # If the serializer is valid, save the issue and dispatch
                    # the update issue activity worker event.
                    serializer.save()
                    # Read-only fields are ignored on save, so they are not reported as changes either.
                    accepted_data = writable_data(serializer, request.data)
                    common.issue_activity.delay(
                        type="issue.activity.updated",
                        requested_data=json.dumps(accepted_data, cls=DjangoJSONEncoder),
                        actor_id=str(request.user.id),
                        issue_id=str(issue.id),
                        project_id=str(project_id),
                        current_instance=current_instance,
                        epoch=int(timezone.now().timestamp()),
                        notification=True,
                        origin=common.base_host(request=request, is_app=True),
                    )
                    # Send the model activity for webhook dispatch
                    common.model_activity.delay(
                        model_name="issue",
                        model_id=str(issue.id),
                        requested_data=accepted_data,
                        current_instance=current_instance,
                        actor_id=request.user.id,
                        slug=slug,
                        origin=common.base_host(request=request, is_app=True),
                    )
                    return Response(serializer.data, status=status.HTTP_200_OK)
                return Response(
                    # If the serializer is not valid, respond with 400 bad
                    # request
                    serializer.errors,
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Issue.DoesNotExist:
                # If the issue does not exist, a new record needs to be created
                # for the requested data.
                # Serialize the data with the context of the project and
                # workspace
                serializer = IssueSerializer(
                    data=request.data,
                    context={
                        "project_id": project_id,
                        "workspace_id": project.workspace_id,
                        "default_assignee_id": project.default_assignee_id,
                    },
                )

                # If the serializer is valid, save the issue and dispatch the
                # issue activity worker event as created
                if serializer.is_valid():
                    serializer.save()

                    common.issue_activity.delay(
                        type="issue.activity.created",
                        requested_data=json.dumps(self.request.data, cls=DjangoJSONEncoder),
                        actor_id=str(request.user.id),
                        issue_id=str(serializer.data.get("id", None)),
                        project_id=str(project_id),
                        current_instance=None,
                        epoch=int(timezone.now().timestamp()),
                        notification=True,
                        origin=common.base_host(request=request, is_app=True),
                    )
                    # Send the model activity for webhook dispatch
                    common.model_activity.delay(
                        model_name="issue",
                        model_id=str(serializer.data["id"]),
                        requested_data=request.data,
                        current_instance=None,
                        actor_id=request.user.id,
                        slug=slug,
                        origin=common.base_host(request=request, is_app=True),
                    )
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response(
                {"error": "external_id and external_source are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @work_item_docs(
        operation_id="update_work_item",
        summary="Partially update work item",
        description="Partially update an existing work item with the provided fields. Supports external ID validation to prevent conflicts.",  # noqa: E501
        parameters=[
            PROJECT_ID_PARAMETER,
        ],
        request=OpenApiRequest(
            request=IssueSerializer,
            examples=[ISSUE_UPDATE_EXAMPLE],
        ),
        responses={
            200: OpenApiResponse(
                description="Work Item patched successfully",
                response=IssueSerializer,
                examples=[ISSUE_EXAMPLE],
            ),
            400: INVALID_REQUEST_RESPONSE,
            404: WORK_ITEM_NOT_FOUND_RESPONSE,
            409: EXTERNAL_ID_EXISTS_RESPONSE,
        },
    )
    def patch(self, request, slug, project_id, pk):
        """Update work item

        Partially update an existing work item with the provided fields.
        Supports external ID validation to prevent conflicts.
        """
        issue = Issue.objects.get(workspace__slug=slug, project_id=project_id, pk=pk)
        project = Project.objects.get(pk=project_id)
        current_instance = json.dumps(IssueSerializer(issue).data, cls=DjangoJSONEncoder)
        serializer = IssueSerializer(
            issue,
            data=request.data,
            context={"project_id": project_id, "workspace_id": project.workspace_id},
            partial=True,
        )
        if serializer.is_valid():
            if (
                request.data.get("external_id")
                and (issue.external_id != str(request.data.get("external_id")))
                and Issue.objects.filter(
                    project_id=project_id,
                    workspace__slug=slug,
                    external_source=request.data.get("external_source", issue.external_source),
                    external_id=request.data.get("external_id"),
                ).exists()
            ):
                return Response(
                    {
                        "error": "Issue with the same external id and external source already exists",
                        "id": str(issue.id),
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            serializer.save()
            # Read-only fields are ignored on save, so they are not reported as changes either.
            accepted_data = writable_data(serializer, request.data)
            common.issue_activity.delay(
                type="issue.activity.updated",
                requested_data=json.dumps(accepted_data, cls=DjangoJSONEncoder),
                actor_id=str(request.user.id),
                issue_id=str(pk),
                project_id=str(project_id),
                current_instance=current_instance,
                epoch=int(timezone.now().timestamp()),
                notification=True,
                origin=common.base_host(request=request, is_app=True),
            )
            # Send the model activity for webhook dispatch
            common.model_activity.delay(
                model_name="issue",
                model_id=str(pk),
                requested_data=accepted_data,
                current_instance=current_instance,
                actor_id=request.user.id,
                slug=slug,
                origin=common.base_host(request=request, is_app=True),
            )
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @work_item_docs(
        operation_id="delete_work_item",
        summary="Delete work item",
        description="Permanently delete an existing work item from the project. Only admins or the item creator can perform this action.",  # noqa: E501
        parameters=[
            PROJECT_ID_PARAMETER,
        ],
        responses={
            204: DELETED_RESPONSE,
            403: ADMIN_ONLY_RESPONSE,
            404: WORK_ITEM_NOT_FOUND_RESPONSE,
        },
    )
    def delete(self, request, slug, project_id, pk):
        """Delete work item

        Permanently delete an existing work item from the project.
        Only admins or the item creator can perform this action.
        """
        issue = Issue.objects.get(workspace__slug=slug, project_id=project_id, pk=pk)
        if issue.created_by_id != request.user.id and (
            not ProjectMember.objects.filter(
                workspace__slug=slug,
                member=request.user,
                role=20,
                project_id=project_id,
                is_active=True,
            ).exists()
        ):
            return Response(
                {"error": "Only admin or creator can delete the work item"},
                status=status.HTTP_403_FORBIDDEN,
            )
        current_instance = json.dumps(IssueSerializer(issue).data, cls=DjangoJSONEncoder)
        issue.delete()
        common.issue_activity.delay(
            type="issue.activity.deleted",
            requested_data=json.dumps({"issue_id": str(pk)}),
            actor_id=str(request.user.id),
            issue_id=str(pk),
            project_id=str(project_id),
            current_instance=current_instance,
            epoch=int(timezone.now().timestamp()),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
