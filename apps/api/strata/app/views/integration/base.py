# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Module imports
from strata.app.permissions import ROLE, allow_permission
from strata.app.serializers import IntegrationSerializer, WorkspaceIntegrationSerializer
from strata.app.views.base import BaseAPIView
from strata.db.models import Integration, WorkspaceIntegration


class IntegrationEndpoint(BaseAPIView):
    """Catalogue of the providers an instance can integrate with.

    Instance-wide and provider-agnostic: it lists what *could* be installed,
    not what *is* installed. The web client pairs it with the workspace's
    installed rows (see ``WorkspaceIntegrationEndpoint``) to decide which
    cards show as installed.

    Readable by any authenticated user — the rows describe publicly known
    providers and carry no workspace-scoped data. The per-workspace rows are
    what require membership, and they are gated separately.
    """

    def get(self, request):
        integrations = Integration.objects.all()
        serializer = IntegrationSerializer(integrations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class WorkspaceIntegrationEndpoint(BaseAPIView):
    """Providers installed into a workspace."""

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def get(self, request, slug):
        workspace_integrations = WorkspaceIntegration.objects.filter(workspace__slug=slug).select_related("integration")
        serializer = WorkspaceIntegrationSerializer(workspace_integrations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class WorkspaceIntegrationProviderEndpoint(BaseAPIView):
    """Uninstall a provider from a workspace.

    Scoped to the workspace in the URL *and* to the row's own workspace, so a
    workspace admin cannot delete another workspace's integration by guessing
    its id.
    """

    @allow_permission(allowed_roles=[ROLE.ADMIN], level="WORKSPACE")
    def delete(self, request, slug, integration_id):
        workspace_integration = WorkspaceIntegration.objects.filter(
            id=integration_id,
            workspace__slug=slug,
        ).first()

        if workspace_integration is None:
            return Response(
                {"error": "The requested integration does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        workspace_integration.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
