# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Third party imports
from rest_framework import serializers

# Module imports
from .base import BaseSerializer
from strata.db.models import Integration, WorkspaceIntegration


class IntegrationSerializer(BaseSerializer):
    """Serializer for the catalogue of integrations an instance offers.

    This is the read-only list behind ``GET /api/integrations/`` — the rows
    that describe *which* providers exist at all (GitHub, Slack, ...). It is
    deliberately a flat catalogue, not a per-workspace view; the web client
    pairs it with the workspace's installed rows to decide what to render.
    """

    class Meta:
        model = Integration
        fields = [
            "id",
            "title",
            "provider",
            "network",
            "description",
            "author",
            "avatar_url",
            "verified",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class WorkspaceIntegrationSerializer(BaseSerializer):
    """Serializer for a provider installed into a specific workspace.

    The web client reads three shapes from this payload:

    * ``integration`` — the id of the catalogue row, used to match a card
      against its provider entry.
    * ``integration_detail`` — the catalogue row itself, nested.
    * ``actor`` / ``api_token`` — the bot identity and token the provider
      acts as.

    ``actor`` and ``api_token`` are exposed as ids rather than nested
    objects: the client only needs to know *that* they exist, and nesting a
    token would put a credential in a list response.
    """

    integration = serializers.UUIDField(source="integration_id", read_only=True)
    integration_detail = IntegrationSerializer(source="integration", read_only=True)
    actor = serializers.UUIDField(source="actor_id", read_only=True)
    api_token = serializers.UUIDField(source="api_token_id", read_only=True)

    class Meta:
        model = WorkspaceIntegration
        fields = [
            "id",
            "workspace",
            "actor",
            "integration",
            "integration_detail",
            "api_token",
            "metadata",
            "config",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
