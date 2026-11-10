# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest
from uuid import uuid4
from django.urls import reverse
from rest_framework import status

from strata.db.models import Integration, WorkspaceIntegration
from strata.db.models.api import APIToken


@pytest.fixture
def integration_catalogue(db):
    """Seed the provider catalogue the settings page renders from."""
    github = Integration.objects.create(
        provider="github",
        title="GitHub",
        network=2,
        author="GitHub",
        verified=True,
        description={"description": "Sync work items with GitHub repositories."},
    )
    slack = Integration.objects.create(
        provider="slack",
        title="Slack",
        network=2,
        author="Slack",
        verified=True,
        description={"description": "Send work item updates to a Slack channel."},
    )
    return {"github": github, "slack": slack}


@pytest.fixture
def workspace_integration(db, workspace, create_user, integration_catalogue):
    """Install the GitHub provider into the test workspace."""
    token = APIToken.objects.create(label="Integration token", user=create_user, user_type=1)
    return WorkspaceIntegration.objects.create(
        workspace=workspace,
        actor=create_user,
        integration=integration_catalogue["github"],
        api_token=token,
    )


@pytest.mark.contract
class TestIntegrationEndpoint:
    """GET /api/integrations/"""

    @pytest.mark.django_db
    def test_returns_catalogue(self, session_client, integration_catalogue):
        """The catalogue lists every provider the instance supports."""
        response = session_client.get(reverse("integrations"))

        assert response.status_code == status.HTTP_200_OK
        providers = {row["provider"] for row in response.data}
        assert providers == {"github", "slack"}

    @pytest.mark.django_db
    def test_empty_catalogue_returns_empty_list(self, session_client, db):
        """An instance with no providers configured returns an empty list, not an error."""
        response = session_client.get(reverse("integrations"))

        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    @pytest.mark.django_db
    def test_requires_authentication(self, api_client, integration_catalogue):
        """The catalogue is not public."""
        response = api_client.get(reverse("integrations"))

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.django_db
    def test_row_carries_the_fields_the_client_renders(self, session_client, integration_catalogue):
        """Each row carries the fields the web card reads: id, provider, title, avatar, verified."""
        response = session_client.get(reverse("integrations"))

        assert response.status_code == status.HTTP_200_OK
        row = next(r for r in response.data if r["provider"] == "github")
        for field in ("id", "provider", "title", "avatar_url", "verified", "description", "metadata"):
            assert field in row
        assert row["title"] == "GitHub"
        assert row["verified"] is True


@pytest.mark.contract
class TestWorkspaceIntegrationEndpoint:
    """GET /api/workspaces/<slug>/workspace-integrations/"""

    @pytest.mark.django_db
    def test_lists_installed_providers(self, session_client, workspace, workspace_integration):
        """A workspace sees the providers installed into it."""
        response = session_client.get(
            reverse("workspace-integrations", kwargs={"slug": workspace.slug}),
        )

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert str(response.data[0]["id"]) == str(workspace_integration.id)

    @pytest.mark.django_db
    def test_row_exposes_integration_detail(self, session_client, workspace, workspace_integration):
        """The client matches a card against its provider via integration_detail."""
        response = session_client.get(
            reverse("workspace-integrations", kwargs={"slug": workspace.slug}),
        )

        assert response.status_code == status.HTTP_200_OK
        row = response.data[0]
        assert row["integration_detail"]["provider"] == "github"
        assert str(row["integration"]) == str(workspace_integration.integration_id)

    @pytest.mark.django_db
    def test_does_not_leak_the_api_token(self, session_client, workspace, workspace_integration):
        """The api_token field is the token's id, never the token itself."""
        response = session_client.get(
            reverse("workspace-integrations", kwargs={"slug": workspace.slug}),
        )

        assert response.status_code == status.HTTP_200_OK
        row = response.data[0]
        assert str(row["api_token"]) == str(workspace_integration.api_token_id)
        assert workspace_integration.api_token.token not in str(response.data)

    @pytest.mark.django_db
    def test_empty_workspace_returns_empty_list(self, session_client, workspace):
        """A workspace with nothing installed returns an empty list."""
        response = session_client.get(
            reverse("workspace-integrations", kwargs={"slug": workspace.slug}),
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    @pytest.mark.django_db
    def test_does_not_leak_across_workspaces(self, session_client, workspace, workspace_integration, db):
        """A provider installed elsewhere is not listed."""
        from strata.db.models import Workspace, WorkspaceMember

        other_user = session_client.handler._force_user
        other_workspace = Workspace.objects.create(
            name="Other Workspace",
            owner=other_user,
            slug="other-workspace",
        )
        WorkspaceMember.objects.create(workspace=other_workspace, member=other_user, role=20)

        token = APIToken.objects.create(label="Other token", user=other_user, user_type=1)
        WorkspaceIntegration.objects.create(
            workspace=other_workspace,
            actor=other_user,
            integration=workspace_integration.integration,
            api_token=token,
        )

        response = session_client.get(
            reverse("workspace-integrations", kwargs={"slug": workspace.slug}),
        )

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert str(response.data[0]["id"]) == str(workspace_integration.id)

    @pytest.mark.django_db
    def test_non_member_is_rejected(self, api_client, workspace, create_user, db):
        """A user who is not in the workspace cannot list its integrations."""
        from strata.db.models import User

        outsider = User.objects.create(
            email=f"outsider-{uuid4().hex[:8]}@strata.so",
            username=f"outsider_{uuid4().hex[:8]}",
        )
        api_client.force_authenticate(user=outsider)

        response = api_client.get(
            reverse("workspace-integrations", kwargs={"slug": workspace.slug}),
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.django_db
    def test_requires_authentication(self, api_client, workspace):
        """The list is not public."""
        response = api_client.get(
            reverse("workspace-integrations", kwargs={"slug": workspace.slug}),
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.contract
class TestWorkspaceIntegrationProviderEndpoint:
    """DELETE /api/workspaces/<slug>/workspace-integrations/<id>/provider/"""

    @pytest.mark.django_db
    def test_uninstalls_provider(self, session_client, workspace, workspace_integration):
        """An admin can uninstall a provider."""
        response = session_client.delete(
            reverse(
                "workspace-integration-provider",
                kwargs={"slug": workspace.slug, "integration_id": workspace_integration.id},
            ),
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not WorkspaceIntegration.objects.filter(id=workspace_integration.id).exists()

    @pytest.mark.django_db
    def test_unknown_integration_is_not_found(self, session_client, workspace):
        """Deleting an id that does not exist is a 404, not a 500."""
        response = session_client.delete(
            reverse(
                "workspace-integration-provider",
                kwargs={"slug": workspace.slug, "integration_id": uuid4()},
            ),
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.django_db
    def test_cannot_uninstall_another_workspaces_integration(
        self, session_client, workspace, workspace_integration, db
    ):
        """The workspace in the URL scopes the delete.

        A workspace admin who learns another workspace's integration id still
        cannot delete it, because the lookup is filtered on the URL's
        workspace as well as the id.
        """
        from strata.db.models import Workspace, WorkspaceMember

        other_user = session_client.handler._force_user
        other_workspace = Workspace.objects.create(
            name="Other Workspace",
            owner=other_user,
            slug="other-workspace",
        )
        WorkspaceMember.objects.create(workspace=other_workspace, member=other_user, role=20)

        token = APIToken.objects.create(label="Other token", user=other_user, user_type=1)
        foreign = WorkspaceIntegration.objects.create(
            workspace=other_workspace,
            actor=other_user,
            integration=workspace_integration.integration,
            api_token=token,
        )

        response = session_client.delete(
            reverse(
                "workspace-integration-provider",
                kwargs={"slug": workspace.slug, "integration_id": foreign.id},
            ),
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert WorkspaceIntegration.objects.filter(id=foreign.id).exists()

    @pytest.mark.django_db
    def test_requires_authentication(self, api_client, workspace, workspace_integration):
        """The endpoint is not public."""
        response = api_client.delete(
            reverse(
                "workspace-integration-provider",
                kwargs={"slug": workspace.slug, "integration_id": workspace_integration.id},
            ),
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
