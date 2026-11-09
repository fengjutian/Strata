# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from importlib import import_module

import pytest
from django.apps import apps as django_apps

from strata.db.models import Profile


@pytest.mark.unit
class TestProfileLanguageDefault:
    """The instance default language is Chinese, English stays available per profile"""

    @pytest.mark.django_db
    def test_profile_language_defaults_to_chinese(self, create_user):
        """A profile nobody edited should start in Chinese, not English"""
        profile = Profile.objects.create(user=create_user)

        assert profile.language == "zh-CN"

    @pytest.mark.django_db
    def test_migration_moves_english_profiles_to_chinese(self, create_user):
        """Profiles stored with the legacy English default are switched over by 0126"""
        migration = import_module("strata.db.migrations.0126_profile_language_default_chinese")
        profile = Profile.objects.create(user=create_user, language="en")

        migration.switch_to_chinese_default(django_apps, None)

        profile.refresh_from_db()
        assert profile.language == "zh-CN"
