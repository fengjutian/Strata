# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest
from rest_framework.test import APIClient
from pytest_django.fixtures import django_db_setup

from strata.db.models import User, Workspace, WorkspaceIntegration, WorkspaceMember
from strata.db.models.api import APIToken


@pytest.fixture(scope="session")
def django_db_setup(django_db_setup):  # noqa: F811
    """Set up the Django database for the test session"""
    pass


@pytest.fixture
def api_client():
    """Return an unauthenticated API client"""
    return APIClient()


@pytest.fixture
def user_data():
    """Return standard user data for tests"""
    return {
        "email": "test@strata.so",
        "password": "test-password",
        "first_name": "Test",
        "last_name": "User",
    }


@pytest.fixture
def create_user(db, user_data):
    """Create and return a user instance"""
    user = User.objects.create(
        email=user_data["email"],
        first_name=user_data["first_name"],
        last_name=user_data["last_name"],
    )
    user.set_password(user_data["password"])
    user.save()
    return user


@pytest.fixture
def api_token(db, create_user):
    """Create and return an API token for testing the external API"""
    token = APIToken.objects.create(
        user=create_user,
        label="Test API Token",
        token="test-api-token-12345",
    )
    return token


@pytest.fixture
def api_key_client(api_client, api_token):
    """Return an API key authenticated client for external API testing"""
    api_client.credentials(HTTP_X_API_KEY=api_token.token)
    return api_client


@pytest.fixture
def session_client(api_client, create_user):
    """Return a session authenticated API client for app API testing, which is what strata.app uses"""
    api_client.force_authenticate(user=create_user)
    return api_client


@pytest.fixture
def create_bot_user(db):
    """Create and return a bot user instance"""
    from uuid import uuid4

    unique_id = uuid4().hex[:8]
    user = User.objects.create(
        email=f"bot-{unique_id}@strata.so",
        username=f"bot_user_{unique_id}",
        first_name="Bot",
        last_name="User",
        is_bot=True,
    )
    user.set_password("bot@123")
    user.save()
    return user


@pytest.fixture
def api_token_data():
    """Return sample API token data for testing"""
    from django.utils import timezone
    from datetime import timedelta

    return {
        "label": "Test API Token",
        "description": "Test description for API token",
        "expired_at": (timezone.now() + timedelta(days=30)).isoformat(),
    }


@pytest.fixture
def create_api_token_for_user(db, create_user):
    """Create and return an API token for a specific user"""
    return APIToken.objects.create(
        label="Test Token",
        description="Test token description",
        user=create_user,
        user_type=0,
    )


@pytest.fixture
def strata_server(live_server):
    """
    Renamed version of live_server fixture to avoid name clashes.
    Returns a live Django server for testing HTTP requests.
    """
    return live_server


@pytest.fixture
def workspace(create_user):
    """
    Create a new workspace and return the
    corresponding Workspace model instance.
    """
    # Create the workspace using the model
    created_workspace = Workspace.objects.create(
        name="Test Workspace",
        owner=create_user,
        slug="test-workspace",
    )

    WorkspaceMember.objects.create(workspace=created_workspace, member=create_user, role=20)

    return created_workspace


@pytest.fixture
def integration_catalogue(db):
    """Seed the provider catalogue the integrations settings page renders from.

    The rows mirror what the ``0127_seed_integrations`` migration creates, so
    tests exercise the same shape a real instance has.
    """
    from strata.db.models import Integration

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
