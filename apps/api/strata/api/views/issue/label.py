# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.db import IntegrityError

# Third party imports
from rest_framework import status
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response

# drf-spectacular imports
from drf_spectacular.utils import OpenApiRequest, OpenApiResponse

# Module imports
from strata.api.serializers import LabelCreateUpdateSerializer, LabelSerializer
from strata.app.permissions import ProjectAdminPermission, ProjectMemberPermission
from strata.db.models import Label
from strata.utils.openapi import (
    CURSOR_PARAMETER,
    DELETED_RESPONSE,
    EXTERNAL_ID_EXISTS_RESPONSE,
    EXPAND_PARAMETER,
    FIELDS_PARAMETER,
    INVALID_REQUEST_RESPONSE,
    LABEL_CREATE_EXAMPLE,
    LABEL_EXAMPLE,
    LABEL_ID_PARAMETER,
    LABEL_NAME_EXISTS_RESPONSE,
    LABEL_NOT_FOUND_RESPONSE,
    LABEL_UPDATE_EXAMPLE,
    ORDER_BY_PARAMETER,
    PER_PAGE_PARAMETER,
    PROJECT_NOT_FOUND_RESPONSE,
    create_paginated_response,
    label_docs,
)

from ..base import BaseAPIView


class LabelListCreateAPIEndpoint(BaseAPIView):
    """Label List and Create Endpoint"""

    serializer_class = LabelSerializer
    model = Label
    permission_classes = [ProjectMemberPermission]
    use_read_replica = True

    # Label writes are project-admin-only, matching the app API.
    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [ProjectMemberPermission()]
        return [ProjectAdminPermission()]

    def get_queryset(self):
        return (
            Label.objects.filter(workspace__slug=self.kwargs.get("slug"))
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(
                project__project_projectmember__member=self.request.user,
                project__project_projectmember__is_active=True,
            )
            .filter(project__archived_at__isnull=True)
            .select_related("project")
            .select_related("workspace")
            .select_related("parent")
            .distinct()
            .order_by(self.kwargs.get("order_by", "-created_at"))
        )

    @label_docs(
        operation_id="create_label",
        description="Create a new label in the specified project with name, color, and description.",
        request=OpenApiRequest(
            request=LabelCreateUpdateSerializer,
            examples=[LABEL_CREATE_EXAMPLE],
        ),
        responses={
            201: OpenApiResponse(
                description="Label created successfully",
                response=LabelSerializer,
                examples=[LABEL_EXAMPLE],
            ),
            400: INVALID_REQUEST_RESPONSE,
            409: LABEL_NAME_EXISTS_RESPONSE,
        },
    )
    def post(self, request, slug, project_id):
        """Create label

        Create a new label in the specified project with name, color, and description.
        Supports external ID tracking for integration purposes.
        """
        try:
            serializer = LabelCreateUpdateSerializer(data=request.data)
            if serializer.is_valid():
                if (
                    request.data.get("external_id")
                    and request.data.get("external_source")
                    and Label.objects.filter(
                        project_id=project_id,
                        workspace__slug=slug,
                        external_source=request.data.get("external_source"),
                        external_id=request.data.get("external_id"),
                    ).exists()
                ):
                    label = Label.objects.filter(
                        workspace__slug=slug,
                        project_id=project_id,
                        external_id=request.data.get("external_id"),
                        external_source=request.data.get("external_source"),
                    ).first()
                    return Response(
                        {
                            "error": "Label with the same external id and external source already exists",
                            "id": str(label.id),
                        },
                        status=status.HTTP_409_CONFLICT,
                    )

                serializer.save(project_id=project_id)
                label = Label.objects.get(pk=serializer.instance.id)
                serializer = LabelSerializer(label)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError:
            label = Label.objects.filter(
                workspace__slug=slug,
                project_id=project_id,
                name=request.data.get("name"),
            ).first()
            return Response(
                {
                    "error": "Label with the same name already exists in the project",
                    "id": str(label.id),
                },
                status=status.HTTP_409_CONFLICT,
            )

    @label_docs(
        operation_id="list_labels",
        description="Retrieve all labels in a project. Supports filtering by name and color.",
        parameters=[
            CURSOR_PARAMETER,
            PER_PAGE_PARAMETER,
            ORDER_BY_PARAMETER,
            FIELDS_PARAMETER,
            EXPAND_PARAMETER,
        ],
        responses={
            200: create_paginated_response(
                LabelSerializer,
                "PaginatedLabelResponse",
                "Paginated list of labels",
                "Paginated Labels",
            ),
            400: INVALID_REQUEST_RESPONSE,
            404: PROJECT_NOT_FOUND_RESPONSE,
        },
    )
    def get(self, request, slug, project_id):
        """List labels

        Retrieve all labels in the project.
        """
        return self.paginate(
            request=request,
            queryset=(self.get_queryset()),
            on_results=lambda labels: LabelSerializer(labels, many=True, fields=self.fields, expand=self.expand).data,
        )


class LabelDetailAPIEndpoint(LabelListCreateAPIEndpoint):
    """Label Detail Endpoint"""

    serializer_class = LabelSerializer
    model = Label
    permission_classes = [ProjectMemberPermission]
    use_read_replica = True

    @label_docs(
        operation_id="get_labels",
        description="Retrieve details of a specific label.",
        parameters=[
            LABEL_ID_PARAMETER,
        ],
        responses={
            200: OpenApiResponse(
                description="Labels",
                response=LabelSerializer,
                examples=[LABEL_EXAMPLE],
            ),
            404: LABEL_NOT_FOUND_RESPONSE,
        },
    )
    def get(self, request, slug, project_id, pk):
        """Retrieve label

        Retrieve details of a specific label.
        """
        label = self.get_queryset().get(pk=pk)
        serializer = LabelSerializer(label)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @label_docs(
        operation_id="update_label",
        description="Partially update an existing label's properties like name, color, or description.",
        parameters=[
            LABEL_ID_PARAMETER,
        ],
        request=OpenApiRequest(
            request=LabelCreateUpdateSerializer,
            examples=[LABEL_UPDATE_EXAMPLE],
        ),
        responses={
            200: OpenApiResponse(
                description="Label updated successfully",
                response=LabelSerializer,
                examples=[LABEL_EXAMPLE],
            ),
            400: INVALID_REQUEST_RESPONSE,
            404: LABEL_NOT_FOUND_RESPONSE,
            409: EXTERNAL_ID_EXISTS_RESPONSE,
        },
    )
    def patch(self, request, slug, project_id, pk):
        """Update label

        Partially update an existing label's properties like name, color, or description.
        Validates external ID uniqueness if provided.
        """
        label = self.get_queryset().get(pk=pk)
        serializer = LabelCreateUpdateSerializer(label, data=request.data, partial=True)
        if serializer.is_valid():
            if (
                request.data.get("external_id")
                and request.data.get("external_source")
                and Label.objects.filter(
                    project_id=project_id,
                    workspace__slug=slug,
                    external_source=request.data.get("external_source"),
                    external_id=request.data.get("external_id"),
                )
                .exclude(id=pk)
                .exists()
            ):
                return Response(
                    {
                        "error": "Label with the same external id and external source already exists",
                        "id": str(label.id),
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            serializer.save()
            label = Label.objects.get(pk=serializer.instance.id)
            serializer = LabelSerializer(label)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @label_docs(
        operation_id="delete_label",
        description="Permanently remove a label from the project. This action cannot be undone.",
        parameters=[
            LABEL_ID_PARAMETER,
        ],
        responses={
            204: DELETED_RESPONSE,
            404: LABEL_NOT_FOUND_RESPONSE,
        },
    )
    def delete(self, request, slug, project_id, pk):
        """Delete label

        Permanently remove a label from the project.
        This action cannot be undone.
        """
        label = self.get_queryset().get(pk=pk)
        label.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
