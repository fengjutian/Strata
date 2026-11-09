# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
import json

# Django imports
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import F, Q
from django.utils import timezone

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# drf-spectacular imports
from drf_spectacular.utils import OpenApiExample, OpenApiRequest, OpenApiResponse

# Module imports
from strata.api.serializers import (
    IssueRelationCreateSerializer,
    IssueRelationResponseSerializer,
    IssueRelationSerializer,
    RelatedIssueSerializer,
)
from strata.app.permissions import ProjectEntityPermission
from strata.db.models import Issue, IssueRelation, Project
from strata.utils.issue_relation_mapper import get_actual_relation
from strata.utils.openapi import (
    CURSOR_PARAMETER,
    EXPAND_PARAMETER,
    FIELDS_PARAMETER,
    INVALID_REQUEST_RESPONSE,
    ISSUE_ID_PARAMETER,
    ISSUE_NOT_FOUND_RESPONSE,
    ORDER_BY_PARAMETER,
    PER_PAGE_PARAMETER,
    work_item_relation_docs,
)

from . import common
from ..base import BaseAPIView
from .permissions import guest_cannot_view_issue, visible_issue_q


class IssueRelationListCreateAPIEndpoint(BaseAPIView):
    """Issue Relation List and Create Endpoint"""

    serializer_class = IssueRelationSerializer
    model = IssueRelation
    permission_classes = [ProjectEntityPermission]
    use_read_replica = True

    @work_item_relation_docs(
        operation_id="list_work_item_relations",
        summary="List work item relations",
        description="Retrieve all relationships for a work item including blocking, blocked_by, duplicate, relates_to, start_before, start_after, finish_before, and finish_after relations.",  # noqa E501
        parameters=[
            ISSUE_ID_PARAMETER,
            CURSOR_PARAMETER,
            PER_PAGE_PARAMETER,
            ORDER_BY_PARAMETER,
            FIELDS_PARAMETER,
            EXPAND_PARAMETER,
        ],
        responses={
            200: OpenApiResponse(
                description="Work item relations grouped by relation type",
                response=IssueRelationResponseSerializer,
                examples=[
                    OpenApiExample(
                        name="Work Item Relations Response",
                        value={
                            "blocking": [
                                {
                                    "project_id": "550e8400-e29b-41d4-a716-446655440010",
                                    "issue_id": "550e8400-e29b-41d4-a716-446655440000",
                                },
                                {
                                    "project_id": "550e8400-e29b-41d4-a716-446655440010",
                                    "issue_id": "550e8400-e29b-41d4-a716-446655440001",
                                },
                            ],
                            "blocked_by": [
                                {
                                    "project_id": "550e8400-e29b-41d4-a716-446655440011",
                                    "issue_id": "550e8400-e29b-41d4-a716-446655440002",
                                },
                            ],
                            "duplicate": [],
                            "relates_to": [
                                {
                                    "project_id": "550e8400-e29b-41d4-a716-446655440010",
                                    "issue_id": "550e8400-e29b-41d4-a716-446655440003",
                                },
                            ],
                            "start_after": [],
                            "start_before": [
                                {
                                    "project_id": "550e8400-e29b-41d4-a716-446655440012",
                                    "issue_id": "550e8400-e29b-41d4-a716-446655440004",
                                },
                            ],
                            "finish_after": [],
                            "finish_before": [],
                        },
                    )
                ],
            ),
            400: INVALID_REQUEST_RESPONSE,
            404: ISSUE_NOT_FOUND_RESPONSE,
        },
    )
    def get(self, request, slug, project_id, issue_id):
        """List work item relations

        Retrieve all relationships for a work item organized by relation type.
        Returns a structured response with relations grouped by type.
        """
        issue = Issue.objects.get(workspace__slug=slug, project_id=project_id, pk=issue_id)
        if guest_cannot_view_issue(request.user.id, issue, slug):
            raise Issue.DoesNotExist()

        # Only list related work items the caller may view.
        visible_issue_ids = Issue.objects.filter(visible_issue_q(request.user)).values("id")
        relations = IssueRelation.objects.filter(
            Q(issue_id=issue_id, related_issue_id__in=visible_issue_ids)
            | Q(related_issue_id=issue_id, issue_id__in=visible_issue_ids),
            workspace__slug=slug,
        ).values(
            "relation_type",
            "issue_id",
            "related_issue_id",
            issue_project_id=F("issue__project_id"),
            related_issue_project_id=F("related_issue__project_id"),
        )

        response_data = {
            "blocking": [],
            "blocked_by": [],
            "duplicate": [],
            "relates_to": [],
            "start_after": [],
            "start_before": [],
            "finish_after": [],
            "finish_before": [],
        }
        seen_duplicate = set()
        seen_relates_to = set()

        for rel in relations:
            rt = rel["relation_type"]
            if rt == "blocked_by":
                if str(rel["related_issue_id"]) == str(issue_id):
                    response_data["blocking"].append(
                        {"project_id": str(rel["issue_project_id"]), "issue_id": str(rel["issue_id"])}
                    )
                if str(rel["issue_id"]) == str(issue_id):
                    response_data["blocked_by"].append(
                        {"project_id": str(rel["related_issue_project_id"]), "issue_id": str(rel["related_issue_id"])}
                    )
            elif rt == "duplicate":
                if str(rel["issue_id"]) == str(issue_id) and rel["related_issue_id"] not in seen_duplicate:
                    seen_duplicate.add(rel["related_issue_id"])
                    response_data["duplicate"].append(
                        {"project_id": str(rel["related_issue_project_id"]), "issue_id": str(rel["related_issue_id"])}
                    )
                if str(rel["related_issue_id"]) == str(issue_id) and rel["issue_id"] not in seen_duplicate:
                    seen_duplicate.add(rel["issue_id"])
                    response_data["duplicate"].append(
                        {"project_id": str(rel["issue_project_id"]), "issue_id": str(rel["issue_id"])}
                    )
            elif rt == "relates_to":
                if str(rel["issue_id"]) == str(issue_id) and rel["related_issue_id"] not in seen_relates_to:
                    seen_relates_to.add(rel["related_issue_id"])
                    response_data["relates_to"].append(
                        {"project_id": str(rel["related_issue_project_id"]), "issue_id": str(rel["related_issue_id"])}
                    )
                if str(rel["related_issue_id"]) == str(issue_id) and rel["issue_id"] not in seen_relates_to:
                    seen_relates_to.add(rel["issue_id"])
                    response_data["relates_to"].append(
                        {"project_id": str(rel["issue_project_id"]), "issue_id": str(rel["issue_id"])}
                    )
            elif rt == "start_before":
                if str(rel["related_issue_id"]) == str(issue_id):
                    response_data["start_after"].append(
                        {"project_id": str(rel["issue_project_id"]), "issue_id": str(rel["issue_id"])}
                    )
                if str(rel["issue_id"]) == str(issue_id):
                    response_data["start_before"].append(
                        {"project_id": str(rel["related_issue_project_id"]), "issue_id": str(rel["related_issue_id"])}
                    )
            elif rt == "finish_before":
                if str(rel["related_issue_id"]) == str(issue_id):
                    response_data["finish_after"].append(
                        {"project_id": str(rel["issue_project_id"]), "issue_id": str(rel["issue_id"])}
                    )
                if str(rel["issue_id"]) == str(issue_id):
                    response_data["finish_before"].append(
                        {"project_id": str(rel["related_issue_project_id"]), "issue_id": str(rel["related_issue_id"])}
                    )

        return Response(response_data, status=status.HTTP_200_OK)

    @work_item_relation_docs(
        operation_id="create_work_item_relation",
        summary="Create work item relation",
        description="Create relationships between work items. Supports various relation types including blocking, blocked_by, duplicate, relates_to, start_before, start_after, finish_before, and finish_after.",  # noqa E501
        parameters=[
            ISSUE_ID_PARAMETER,
        ],
        request=OpenApiRequest(
            request=IssueRelationCreateSerializer,
            examples=[
                OpenApiExample(
                    name="Create blocking relation",
                    value={
                        "relation_type": "blocking",
                        "issues": [
                            "550e8400-e29b-41d4-a716-446655440000",
                            "550e8400-e29b-41d4-a716-446655440001",
                        ],
                    },
                )
            ],
        ),
        responses={
            201: OpenApiResponse(
                description="Work item relations created successfully",
                response=IssueRelationSerializer(many=True),
                examples=[
                    OpenApiExample(
                        name="Relations created",
                        value=[
                            {
                                "id": "550e8400-e29b-41d4-a716-446655440000",
                                "name": "Fix authentication bug",
                                "sequence_id": 42,
                                "project_id": "550e8400-e29b-41d4-a716-446655440001",
                                "relation_type": "blocked_by",
                                "state_id": "550e8400-e29b-41d4-a716-446655440002",
                                "priority": "high",
                                "created_at": "2024-01-15T10:00:00Z",
                                "updated_at": "2024-01-15T10:00:00Z",
                                "created_by": "550e8400-e29b-41d4-a716-446655440004",
                                "updated_by": "550e8400-e29b-41d4-a716-446655440004",
                            }
                        ],
                    )
                ],
            ),
            400: INVALID_REQUEST_RESPONSE,
            404: ISSUE_NOT_FOUND_RESPONSE,
        },
    )
    def post(self, request, slug, project_id, issue_id):
        """Create work item relation

        Create relationships between work items with specified relation type.
        Automatically tracks relation creation activity.
        """
        # Validate request data using serializer
        serializer = IssueRelationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        relation_type = serializer.validated_data["relation_type"]
        issues = serializer.validated_data["issues"]
        project = Project.objects.get(pk=project_id, workspace__slug=slug)
        # The URL issue is one side of every relation; bind it to the URL project too.
        Issue.issue_objects.get(workspace__slug=slug, project_id=project_id, pk=issue_id)

        actual_relation = get_actual_relation(relation_type)
        is_reverse = relation_type in ["blocking", "start_after", "finish_after"]

        # Scope to workspace to prevent cross-tenant IDOR
        # Relations can cross projects so only workspace scope is enforced
        issues = list(
            Issue.issue_objects.filter(
                workspace__slug=slug,
                pk__in=issues,
            ).values_list("id", flat=True)
        )

        IssueRelation.objects.bulk_create(
            [
                IssueRelation(
                    issue_id=(issue if is_reverse else issue_id),
                    related_issue_id=(issue_id if is_reverse else issue),
                    relation_type=actual_relation,
                    project_id=project_id,
                    workspace_id=project.workspace_id,
                    created_by=request.user,
                    updated_by=request.user,
                )
                for issue in issues
            ],
            batch_size=10,
            ignore_conflicts=True,
        )

        common.issue_activity.delay(
            type="issue_relation.activity.created",
            requested_data=json.dumps({"relation_type": relation_type, "issues": issues}, cls=DjangoJSONEncoder),
            actor_id=str(request.user.id),
            issue_id=str(issue_id),
            project_id=str(project_id),
            current_instance=None,
            epoch=int(timezone.now().timestamp()),
            notification=True,
            origin=common.base_host(request=request, is_app=True),
        )

        # Re-fetch with select_related to avoid N+1 queries in serializers.
        # bulk_create with ignore_conflicts=True may not return PKs,
        # so query by the issue/related_issue pairs and relation type.
        if is_reverse:
            refetch_filter = Q(
                issue_id__in=issues,
                related_issue_id=issue_id,
                relation_type=actual_relation,
            )
        else:
            refetch_filter = Q(
                issue_id=issue_id,
                related_issue_id__in=issues,
                relation_type=actual_relation,
            )

        refetched_relations = IssueRelation.objects.filter(
            refetch_filter,
            workspace__slug=slug,
        ).select_related(
            "issue__state",
            "related_issue__state",
        )

        serializer_class = RelatedIssueSerializer if is_reverse else IssueRelationSerializer
        return Response(
            serializer_class(refetched_relations, many=True).data,
            status=status.HTTP_201_CREATED,
        )
