# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

from django.db import models

from .project import ProjectBaseModel


class AutomationRule(ProjectBaseModel):
    class Trigger(models.TextChoices):
        ISSUE_CREATED = "issue_created", "Issue created"
        ISSUE_STATE_CHANGED = "issue_state_changed", "Issue state changed"

    name = models.CharField(max_length=255)
    trigger = models.CharField(max_length=32, choices=Trigger.choices)
    conditions = models.JSONField(default=dict)
    actions = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "automation_rules"
        ordering = ("-created_at",)


class AutomationExecution(ProjectBaseModel):
    class Status(models.TextChoices):
        SUCCEEDED = "succeeded", "Succeeded"
        SKIPPED = "skipped", "Skipped"
        FAILED = "failed", "Failed"

    rule = models.ForeignKey(AutomationRule, on_delete=models.CASCADE, related_name="executions")
    issue = models.ForeignKey("db.Issue", on_delete=models.CASCADE, related_name="automation_executions")
    status = models.CharField(max_length=16, choices=Status.choices)
    details = models.JSONField(default=dict)

    class Meta:
        db_table = "automation_executions"
        ordering = ("-created_at",)
