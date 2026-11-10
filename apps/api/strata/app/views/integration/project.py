# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Module imports
from strata.app.permissions import ROLE, allow_permission
from strata.app.views.base import BaseAPIView
from strata.db.models import (
    GithubRepository,
    GithubRepositorySync,
    Project,
    SlackProjectSync,
    WorkspaceIntegration,
)


class WorkspaceIntegrationGithubRepositoriesEndpoint(BaseAPIView):
    """List the GitHub repositories available to a workspace integration.

    The client uses this to populate the repository picker before a
    repository is bound to a project. The rows come from the integration's
    own metadata (``GithubRepository`` rows recorded when the integration was
    installed), so no call is made out to GitHub here.
    """

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def get(self, request, slug, integration_id):
        workspace_integration = WorkspaceIntegration.objects.filter(
            id=integration_id,
            workspace__slug=slug,
        ).first()

        if workspace_integration is None:
            return Response(
                {"error": "The requested integration does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        repositories = GithubRepository.objects.filter(
            project__workspace__slug=slug,
        ).distinct()

        return Response(
            [
                {
                    "id": str(repository.id),
                    "name": repository.name,
                    "owner": repository.owner,
                    "url": repository.url,
                    "repository_id": str(repository.repository_id),
                }
                for repository in repositories
            ],
            status=status.HTTP_200_OK,
        )


class GithubRepositorySyncEndpoint(BaseAPIView):
    """Bind a GitHub repository to a project through a workspace's GitHub integration.

    This is the project-level half of the GitHub integration: the workspace
    integration says "this workspace may talk to GitHub", and this row says
    "this project syncs with this repository".

    The repository record is keyed by ``(project, repository_id)`` on the
    GitHub side, so re-syncing the same repository to the same project
    updates the existing sync rather than creating a duplicate.
    """

    @allow_permission(allowed_roles=[ROLE.ADMIN], level="WORKSPACE")
    def post(self, request, slug, project_id, integration_id):
        project = Project.objects.filter(pk=project_id, workspace__slug=slug).first()
        if project is None:
            return Response(
                {"error": "The project does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        workspace_integration = WorkspaceIntegration.objects.filter(
            id=integration_id,
            workspace__slug=slug,
        ).first()
        if workspace_integration is None:
            return Response(
                {"error": "The requested integration does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        name = request.data.get("name", "").strip()
        owner = request.data.get("owner", "").strip()
        url = request.data.get("url", "").strip()
        repository_id = request.data.get("repository_id", "").strip()

        if not name or not owner or not repository_id:
            return Response(
                {"error": "name, owner and repository_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        repository, _ = GithubRepository.objects.get_or_create(
            project=project,
            repository_id=repository_id,
            defaults={
                "name": name,
                "owner": owner,
                "url": url or None,
                "config": {},
            },
        )

        # A repository can only be synced into one project per workspace
        # integration; get_or_create on the unique (project, repository)
        # pair keeps a repeated call idempotent.
        sync, created = GithubRepositorySync.objects.get_or_create(
            project=project,
            repository=repository,
            defaults={
                "actor": workspace_integration.actor,
                "workspace_integration": workspace_integration,
                "credentials": {},
            },
        )

        if not created:
            # Re-point the sync at the integration that posted it, so a
            # repository moved between integrations does not keep the old one.
            sync.workspace_integration = workspace_integration
            sync.save()

        return Response(
            {
                "id": str(sync.id),
                "repository_id": str(repository.repository_id),
                "repository": str(repository.id),
                "project": str(project.id),
                "workspace_integration": str(workspace_integration.id),
                "name": repository.name,
                "owner": repository.owner,
                "url": repository.url,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def get(self, request, slug, project_id, integration_id):
        """List the repositories synced into the project via this integration."""
        syncs = GithubRepositorySync.objects.filter(
            project_id=project_id,
            project__workspace__slug=slug,
            workspace_integration_id=integration_id,
        ).select_related("repository")

        return Response(
            [
                {
                    "id": str(sync.id),
                    "repository_id": str(sync.repository.repository_id),
                    "repository": str(sync.repository.id),
                    "project": str(sync.project_id),
                    "workspace_integration": str(sync.workspace_integration_id),
                    "name": sync.repository.name,
                    "owner": sync.repository.owner,
                    "url": sync.repository.url,
                }
                for sync in syncs
            ],
            status=status.HTTP_200_OK,
        )


class ProjectSlackSyncEndpoint(BaseAPIView):
    """Bind a Slack channel to a project through a workspace's Slack integration.

    The mirror image of the GitHub endpoint: the workspace integration grants
    the right to talk to Slack, and this row says "this project posts to this
    channel".
    """

    @allow_permission(allowed_roles=[ROLE.ADMIN], level="WORKSPACE")
    def post(self, request, slug, project_id, integration_id):
        project = Project.objects.filter(pk=project_id, workspace__slug=slug).first()
        if project is None:
            return Response(
                {"error": "The project does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        workspace_integration = WorkspaceIntegration.objects.filter(
            id=integration_id,
            workspace__slug=slug,
        ).first()
        if workspace_integration is None:
            return Response(
                {"error": "The requested integration does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = request.data.get("data", {}) or {}
        webhook_url = request.data.get("webhook_url", "").strip()
        team_id = request.data.get("team_id", "").strip()
        team_name = request.data.get("team_name", "").strip()

        if not webhook_url or not team_id:
            return Response(
                {"error": "webhook_url and team_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sync, created = SlackProjectSync.objects.get_or_create(
            team_id=team_id,
            project=project,
            defaults={
                "access_token": request.data.get("access_token", ""),
                "scopes": request.data.get("scopes", ""),
                "bot_user_id": request.data.get("bot_user_id", ""),
                "webhook_url": webhook_url,
                "team_name": team_name,
                "data": data,
                "workspace_integration": workspace_integration,
            },
        )

        return Response(
            {
                "id": str(sync.id),
                "project": str(project.id),
                "workspace": str(project.workspace_id),
                "workspace_integration": str(workspace_integration.id),
                "access_token": sync.access_token,
                "scopes": sync.scopes,
                "bot_user_id": sync.bot_user_id,
                "webhook_url": sync.webhook_url,
                "team_id": sync.team_id,
                "team_name": sync.team_name,
                "data": sync.data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def get(self, request, slug, project_id, integration_id):
        """List the Slack channels bound to the project via this integration."""
        syncs = SlackProjectSync.objects.filter(
            project_id=project_id,
            project__workspace__slug=slug,
            workspace_integration_id=integration_id,
        )

        return Response(
            [
                {
                    "id": str(sync.id),
                    "project": str(sync.project_id),
                    "workspace": str(sync.project.workspace_id),
                    "workspace_integration": str(sync.workspace_integration_id),
                    "access_token": sync.access_token,
                    "scopes": sync.scopes,
                    "bot_user_id": sync.bot_user_id,
                    "webhook_url": sync.webhook_url,
                    "team_id": sync.team_id,
                    "team_name": sync.team_name,
                    "data": sync.data,
                }
                for sync in syncs
            ],
            status=status.HTTP_200_OK,
        )

    @allow_permission(allowed_roles=[ROLE.ADMIN], level="WORKSPACE")
    def delete(self, request, slug, project_id, integration_id, slack_sync_id):
        """Unbind a Slack channel from the project."""
        sync = SlackProjectSync.objects.filter(
            id=slack_sync_id,
            project_id=project_id,
            project__workspace__slug=slug,
            workspace_integration_id=integration_id,
        ).first()

        if sync is None:
            return Response(
                {"error": "The requested Slack integration does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        sync.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
