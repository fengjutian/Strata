# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.urls import path

from strata.app.views import (
    GithubRepositorySyncEndpoint,
    IntegrationEndpoint,
    ProjectSlackSyncEndpoint,
    WorkspaceIntegrationEndpoint,
    WorkspaceIntegrationGithubRepositoriesEndpoint,
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
    # No trailing slash: the web client calls this path without one
    # (services/integrations/github.service.ts).
    path(
        "workspaces/<str:slug>/workspace-integrations/<uuid:integration_id>/github-repositories",
        WorkspaceIntegrationGithubRepositoriesEndpoint.as_view(),
        name="workspace-integration-github-repositories",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/workspace-integrations/"
        "<uuid:integration_id>/github-repository-sync/",
        GithubRepositorySyncEndpoint.as_view(),
        name="github-repository-sync",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/workspace-integrations/"
        "<uuid:integration_id>/project-slack-sync/",
        ProjectSlackSyncEndpoint.as_view(),
        name="project-slack-sync",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/workspace-integrations/"
        "<uuid:integration_id>/project-slack-sync/<uuid:slack_sync_id>",
        ProjectSlackSyncEndpoint.as_view(),
        name="project-slack-sync",
    ),
]
