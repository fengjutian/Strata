# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
import re

# Django imports
from django.db.models import Exists, OuterRef, Q

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# drf-spectacular imports
from drf_spectacular.utils import OpenApiResponse, extend_schema

# Module imports
from strata.api.serializers import IssueSearchSerializer
from strata.db.models import Issue
from strata.utils.openapi import (
    BAD_SEARCH_REQUEST_RESPONSE,
    FORBIDDEN_RESPONSE,
    ISSUE_SEARCH_EXAMPLE,
    LIMIT_PARAMETER,
    PROJECT_ID_QUERY_PARAMETER,
    SEARCH_PARAMETER_REQUIRED,
    UNAUTHORIZED_RESPONSE,
    WORKSPACE_NOT_FOUND_RESPONSE,
    WORKSPACE_SEARCH_PARAMETER,
    WORKSPACE_SLUG_PARAMETER,
)

from ..base import BaseAPIView
from .permissions import visible_issue_q


class IssueSearchEndpoint(BaseAPIView):
    """Endpoint to search across multiple fields in the issues"""

    use_read_replica = True

    @extend_schema(
        operation_id="search_work_items",
        tags=["Work Items"],
        description="Perform semantic search across issue names, sequence IDs, and project identifiers.",
        parameters=[
            WORKSPACE_SLUG_PARAMETER,
            SEARCH_PARAMETER_REQUIRED,
            LIMIT_PARAMETER,
            WORKSPACE_SEARCH_PARAMETER,
            PROJECT_ID_QUERY_PARAMETER,
        ],
        responses={
            200: OpenApiResponse(
                description="Work item search results",
                response=IssueSearchSerializer,
                examples=[ISSUE_SEARCH_EXAMPLE],
            ),
            400: BAD_SEARCH_REQUEST_RESPONSE,
            401: UNAUTHORIZED_RESPONSE,
            403: FORBIDDEN_RESPONSE,
            404: WORKSPACE_NOT_FOUND_RESPONSE,
        },
    )
    def get(self, request, slug):
        """Search work items

        Perform semantic search across work item names, sequence IDs, and project identifiers.
        Supports workspace-wide or project-specific search with configurable result limits.
        """
        query = request.query_params.get("search", False)
        limit = request.query_params.get("limit", 10)
        workspace_search = request.query_params.get("workspace_search", "false")
        project_id = request.query_params.get("project_id", False)

        if not query:
            return Response({"issues": []}, status=status.HTTP_200_OK)

        # Build search query
        fields = ["name", "sequence_id", "project__identifier"]
        q = Q()
        for field in fields:
            if field == "sequence_id":
                # Match whole integers only (exclude decimal numbers)
                sequences = re.findall(r"\b\d+\b", query)
                for sequence_id in sequences:
                    q |= Q(**{"sequence_id": sequence_id})
            else:
                q |= Q(**{f"{field}__icontains": query})

        # Restricted guests may only search work items they created. Search
        # can span several projects, so this is a per-row EXISTS check
        # mirroring IssueDetailEndpoint.get's tiered membership check.
        visible_issue_subquery = (
            Issue.issue_objects.filter(id=OuterRef("id")).filter(visible_issue_q(self.request.user)).values("id")
        )

        # Filter issues
        issues = Issue.issue_objects.filter(
            q,
            project__archived_at__isnull=True,
            workspace__slug=slug,
        ).filter(Exists(visible_issue_subquery))

        # Apply project filter if not searching across workspace
        if workspace_search == "false" and project_id:
            issues = issues.filter(project_id=project_id)

        # Get results
        issue_results = issues.distinct().values(
            "name",
            "id",
            "sequence_id",
            "project__identifier",
            "project_id",
            "workspace__slug",
        )[: int(limit)]

        return Response({"issues": issue_results}, status=status.HTTP_200_OK)
