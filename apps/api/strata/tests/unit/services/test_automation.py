import pytest

from strata.db.models import AutomationExecution, AutomationRule, Issue
from strata.services.automation import run_issue_automations


@pytest.mark.django_db
class TestIssueAutomation:
    def test_matching_create_rule_updates_priority(self, issue, project):
        rule = AutomationRule.objects.create(
            name="Urgent on create",
            trigger=AutomationRule.Trigger.ISSUE_CREATED,
            conditions={"priority": issue.priority},
            actions={"priority": "urgent"},
            project=project,
            workspace=project.workspace,
        )

        run_issue_automations(issue_id=issue.id, trigger=AutomationRule.Trigger.ISSUE_CREATED)

        issue.refresh_from_db()
        assert issue.priority == "urgent"
        assert AutomationExecution.objects.get(rule=rule).status == AutomationExecution.Status.SUCCEEDED

    def test_non_matching_rule_does_not_create_execution(self, issue, project):
        rule = AutomationRule.objects.create(
            name="Only low priority",
            trigger=AutomationRule.Trigger.ISSUE_CREATED,
            conditions={"priority": "low"},
            actions={"priority": "urgent"},
            project=project,
            workspace=project.workspace,
        )

        run_issue_automations(issue_id=issue.id, trigger=AutomationRule.Trigger.ISSUE_CREATED)

        assert not AutomationExecution.objects.filter(rule=rule).exists()
        assert Issue.objects.get(id=issue.id).priority == issue.priority

    def test_inactive_rule_is_ignored(self, issue, project):
        rule = AutomationRule.objects.create(
            name="Disabled",
            trigger=AutomationRule.Trigger.ISSUE_CREATED,
            conditions={},
            actions={"priority": "urgent"},
            is_active=False,
            project=project,
            workspace=project.workspace,
        )

        run_issue_automations(issue_id=issue.id, trigger=AutomationRule.Trigger.ISSUE_CREATED)

        assert not AutomationExecution.objects.filter(rule=rule).exists()
