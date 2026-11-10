# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest
from uuid import uuid4
from django.urls import reverse
from rest_framework import status

from strata.db.models import (
    GithubRepository,
    GithubRepositorySync,
    Project,
    ProjectMember,
    SlackProjectSync,
    User,
    Workspace,
    WorkspaceMember,
)


@pytest.fixture
def project(db, workspace, create_user):
    """A project; ``create_user`` (session_client) administers it."""
    project = Project.objects.create(
        name="Integration Project",
        identifier="IP",
        workspace=workspace,
        created_by=create_user,
    )
    ProjectMember.objects.create(project=project, member=create_user, workspace=workspace, role=20)
    return project


def github_sync_url(slug, project_id, integration_id):
    return reverse(
        "github-repository-sync",
        kwargs={"slug": slug, "project_id": project_id, "integration_id": integration_id},
    )


def slack_sync_url(slug, project_id, integration_id, slack_sync_id=None):
    kwargs = {"slug": slug, "project_id": project_id, "integration_id": integration_id}
    if slack_sync_id is not None:
        kwargs["slack_sync_id"] = slack_sync_id
    return reverse("project-slack-sync", kwargs=kwargs)


@pytest.mark.contract
class TestWorkspaceIntegrationGithubRepositoriesEndpoint:
    """GET /api/workspaces/<slug>/workspace-integrations/<id>/github-repositories"""

    @pytest.mark.django_db
    def test_lists_repositories_in_the_workspace(self, session_client, workspace, project, workspace_integration):
        """Repositories known to the workspace are listed."""
        GithubRepository.objects.create(
            project=project,
            name="plane",
            owner="makestrata",
            repository_id="123456",
            url="https://github.com/makestrata/plane",
        )

        response = session_client.get(
            reverse(
                "workspace-integration-github-repositories",
                kwargs={"slug": workspace.slug, "integration_id": workspace_integration.id},
            ),
        )

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["name"] == "plane"
        assert response.data[0]["repository_id"] == "123456"

    @pytest.mark.django_db
    def test_unknown_integration_is_not_found(self, session_client, workspace):
        """An integration that is not in this workspace is a 404."""
        response = session_client.get(
            reverse(
                "workspace-integration-github-repositories",
                kwargs={"slug": workspace.slug, "integration_id": uuid4()},
            ),
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.django_db
    def test_requires_authentication(self, api_client, workspace, workspace_integration):
        """The endpoint is not public."""
        response = api_client.get(
            reverse(
                "workspace-integration-github-repositories",
                kwargs={"slug": workspace.slug, "integration_id": workspace_integration.id},
            ),
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.contract
class TestGithubRepositorySyncEndpoint:
    """Project-level GitHub repository sync."""

    @pytest.mark.django_db
    def test_binds_repository_to_project(self, session_client, workspace, project, workspace_integration):
        """A repository can be synced into a project through a workspace integration."""
        response = session_client.post(
            github_sync_url(workspace.slug, project.id, workspace_integration.id),
            {
                "name": "plane",
                "owner": "makestrata",
                "repository_id": "123456",
                "url": "https://github.com/makestrata/plane",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "plane"
        assert response.data["owner"] == "makestrata"
        assert GithubRepositorySync.objects.filter(project=project).count() == 1

    @pytest.mark.django_db
    def test_is_idempotent(self, session_client, workspace, project, workspace_integration):
        """Syncing the same repository twice does not create a second row."""
        payload = {
            "name": "plane",
            "owner": "makestrata",
            "repository_id": "123456",
            "url": "https://github.com/makestrata/plane",
        }
        url = github_sync_url(workspace.slug, project.id, workspace_integration.id)

        first = session_client.post(url, payload, format="json")
        second = session_client.post(url, payload, format="json")

        assert first.status_code == status.HTTP_201_CREATED
        assert second.status_code == status.HTTP_200_OK
        assert GithubRepositorySync.objects.filter(project=project).count() == 1
        assert GithubRepository.objects.filter(project=project).count() == 1

    @pytest.mark.django_db
    def test_missing_required_fields_is_rejected(self, session_client, workspace, project, workspace_integration):
        """A payload without name/owner/repository_id is a 400."""
        response = session_client.post(
            github_sync_url(workspace.slug, project.id, workspace_integration.id),
            {"name": "plane"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not GithubRepositorySync.objects.filter(project=project).exists()

    @pytest.mark.django_db
    def test_unknown_integration_is_not_found(self, session_client, workspace, project):
        """Binding through an integration that is not in this workspace is a 404."""
        response = session_client.post(
            github_sync_url(workspace.slug, project.id, uuid4()),
            {
                "name": "plane",
                "owner": "makestrata",
                "repository_id": "123456",
                "url": "https://github.com/makestrata/plane",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert not GithubRepositorySync.objects.filter(project=project).exists()

    @pytest.mark.django_db
    def test_unknown_project_is_not_found(self, session_client, workspace, workspace_integration):
        """Binding into a project that is not in this workspace is a 404."""
        response = session_client.post(
            github_sync_url(workspace.slug, uuid4(), workspace_integration.id),
            {
                "name": "plane",
                "owner": "makestrata",
                "repository_id": "123456",
                "url": "https://github.com/makestrata/plane",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.django_db
    def test_lists_synced_repositories(self, session_client, workspace, project, workspace_integration):
        """The project's synced repositories are listed."""
        session_client.post(
            github_sync_url(workspace.slug, project.id, workspace_integration.id),
            {
                "name": "plane",
                "owner": "makestrata",
                "repository_id": "123456",
                "url": "https://github.com/makestrata/plane",
            },
            format="json",
        )

        response = session_client.get(
            github_sync_url(workspace.slug, project.id, workspace_integration.id),
        )

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["name"] == "plane"

    @pytest.mark.django_db
    def test_does_not_list_another_workspaces_repositories(
        self, session_client, workspace, project, workspace_integration
    ):
        """A repository synced elsewhere is not listed for this project."""
        unique_id = uuid4().hex[:8]
        owner = User.objects.create(email=f"victim-{unique_id}@strata.so", username=f"victim_{unique_id}")
        other_ws = Workspace.objects.create(name="Victim Workspace", slug=f"victim-{unique_id}", owner=owner)
        WorkspaceMember.objects.create(workspace=other_ws, member=owner, role=20)
        other_project = Project.objects.create(
            name="Victim Project",
            identifier="VIC",
            workspace=other_ws,
            created_by=owner,
        )

        GithubRepository.objects.create(
            project=other_project,
            name="secret",
            owner="someone",
            repository_id="999",
            url="https://github.com/someone/secret",
        )

        response = session_client.get(
            github_sync_url(workspace.slug, project.id, workspace_integration.id),
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    @pytest.mark.django_db
    def test_requires_authentication(self, api_client, workspace, project, workspace_integration):
        """The endpoint is not public."""
        response = api_client.post(
            github_sync_url(workspace.slug, project.id, workspace_integration.id),
            {
                "name": "plane",
                "owner": "makestrata",
                "repository_id": "123456",
                "url": "https://github.com/makestrata/plane",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.contract
class TestProjectSlackSyncEndpoint:
    """Project-level Slack channel sync."""

    @pytest.fixture
    def slack_integration(self, db, workspace, create_user, integration_catalogue):
        """Install the Slack provider into the test workspace."""
        from strata.db.models import WorkspaceIntegration
        from strata.db.models.api import APIToken

        token = APIToken.objects.create(label="Slack token", user=create_user, user_type=1)
        return WorkspaceIntegration.objects.create(
            workspace=workspace,
            actor=create_user,
            integration=integration_catalogue["slack"],
            api_token=token,
        )

    @pytest.mark.django_db
    def test_binds_channel_to_project(self, session_client, workspace, project, slack_integration):
        """A Slack channel can be bound to a project through a workspace integration."""
        response = session_client.post(
            slack_sync_url(workspace.slug, project.id, slack_integration.id),
            {
                "access_token": "xoxb-token",
                "scopes": "chat:write",
                "bot_user_id": "U123",
                "webhook_url": "https://hooks.slack.com/services/T000/B000/XXX",
                "team_id": "T000",
                "team_name": "Acme",
                "data": {"ok": True},
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["team_id"] == "T000"
        assert response.data["team_name"] == "Acme"
        assert SlackProjectSync.objects.filter(project=project).count() == 1

    @pytest.mark.django_db
    def test_missing_required_fields_is_rejected(self, session_client, workspace, project, slack_integration):
        """A payload without webhook_url/team_id is a 400."""
        response = session_client.post(
            slack_sync_url(workspace.slug, project.id, slack_integration.id),
            {"access_token": "xoxb-token"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not SlackProjectSync.objects.filter(project=project).exists()

    @pytest.mark.django_db
    def test_unknown_integration_is_not_found(self, session_client, workspace, project):
        """Binding through an integration that is not in this workspace is a 404."""
        response = session_client.post(
            slack_sync_url(workspace.slug, project.id, uuid4()),
            {
                "webhook_url": "https://hooks.slack.com/services/T000/B000/XXX",
                "team_id": "T000",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.django_db
    def test_lists_bound_channels(self, session_client, workspace, project, slack_integration):
        """The project's bound Slack channels are listed."""
        session_client.post(
            slack_sync_url(workspace.slug, project.id, slack_integration.id),
            {
                "webhook_url": "https://hooks.slack.com/services/T000/B000/XXX",
                "team_id": "T000",
                "team_name": "Acme",
            },
            format="json",
        )

        response = session_client.get(slack_sync_url(workspace.slug, project.id, slack_integration.id))

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["team_id"] == "T000"

    @pytest.mark.django_db
    def test_unbinds_channel(self, session_client, workspace, project, slack_integration):
        """A bound channel can be removed."""
        created = session_client.post(
            slack_sync_url(workspace.slug, project.id, slack_integration.id),
            {
                "webhook_url": "https://hooks.slack.com/services/T000/B000/XXX",
                "team_id": "T000",
            },
            format="json",
        )
        sync_id = created.data["id"]

        response = session_client.delete(
            slack_sync_url(workspace.slug, project.id, slack_integration.id, sync_id),
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not SlackProjectSync.objects.filter(id=sync_id).exists()

    @pytest.mark.django_db
    def test_unbind_unknown_channel_is_not_found(self, session_client, workspace, project, slack_integration):
        """Removing a channel id that does not exist is a 404."""
        response = session_client.delete(
            slack_sync_url(workspace.slug, project.id, slack_integration.id, uuid4()),
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.django_db
    def test_cannot_unbind_another_projects_channel(self, session_client, workspace, project, slack_integration, db):
        """A channel bound to another project is not removable through this project."""
        unique_id = uuid4().hex[:8]
        owner = User.objects.create(email=f"victim-{unique_id}@strata.so", username=f"victim_{unique_id}")
        other_ws = Workspace.objects.create(name="Victim Workspace", slug=f"victim-{unique_id}", owner=owner)
        WorkspaceMember.objects.create(workspace=other_ws, member=owner, role=20)
        other_project = Project.objects.create(
            name="Victim Project",
            identifier="VIC",
            workspace=other_ws,
            created_by=owner,
        )
        foreign = SlackProjectSync.objects.create(
            project=other_project,
            access_token="xoxb-token",
            scopes="chat:write",
            bot_user_id="U999",
            webhook_url="https://hooks.slack.com/services/T999/B999/YYY",
            team_id="T999",
            team_name="Victim Team",
            data={},
            workspace_integration=slack_integration,
        )

        response = session_client.delete(
            slack_sync_url(workspace.slug, project.id, slack_integration.id, foreign.id),
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert SlackProjectSync.objects.filter(id=foreign.id).exists()
