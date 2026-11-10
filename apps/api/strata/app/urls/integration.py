# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.urls import path

from strata.app.views import (
    IntegrationEndpoint,
    WorkspaceIntegrationEndpoint,
    WorkspaceIntegrationProviderEndpoint,
)


urlpatterns = [
    path(
        "integrations/",
        IntegrationEndpoint.as_view(),
        name="integrations",
    ),
    path(
        "workspaces/<str:slug>/workspace-integrations/",
        WorkspaceIntegrationEndpoint.as_view(),
        name="workspace-integrations",
    ),
    path(
        "workspaces/<str:slug>/workspace-integrations/<uuid:integration_id>/provider/",
        WorkspaceIntegrationProviderEndpoint.as_view(),
        name="workspace-integration-provider",
    ),
]
