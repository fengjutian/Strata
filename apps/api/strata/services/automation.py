import logging

from django.db import transaction

from strata.db.models import AutomationExecution, AutomationRule, Issue, IssueAssignee, IssueLabel

logger = logging.getLogger(__name__)


def _matches(issue, conditions):
    return all(str(getattr(issue, key)) == str(value) for key, value in conditions.items())


def run_issue_automations(*, issue_id, trigger, actor_id=None):
    issue = Issue.objects.get(id=issue_id)
    rules = AutomationRule.objects.filter(project_id=issue.project_id, trigger=trigger, is_active=True)

    for rule in rules:
        try:
            if not _matches(issue, rule.conditions):
                continue
            changed = []
            with transaction.atomic():
                priority = rule.actions.get("priority")
                if priority is not None and issue.priority != priority:
                    Issue.objects.filter(id=issue.id).update(priority=priority, updated_by_id=actor_id)
                    issue.priority = priority
                    changed.append("priority")

                for assignee_id in rule.actions.get("assignee_ids", []):
                    _, created = IssueAssignee.objects.get_or_create(
                        issue_id=issue.id,
                        assignee_id=assignee_id,
                        defaults={
                            "project_id": issue.project_id,
                            "workspace_id": issue.workspace_id,
                            "created_by_id": actor_id,
                            "updated_by_id": actor_id,
                        },
                    )
                    if created:
                        changed.append("assignee")

                for label_id in rule.actions.get("label_ids", []):
                    _, created = IssueLabel.objects.get_or_create(
                        issue_id=issue.id,
                        label_id=label_id,
                        defaults={
                            "project_id": issue.project_id,
                            "workspace_id": issue.workspace_id,
                            "created_by_id": actor_id,
                            "updated_by_id": actor_id,
                        },
                    )
                    if created:
                        changed.append("label")

                AutomationExecution.objects.create(
                    rule=rule,
                    issue=issue,
                    project_id=issue.project_id,
                    workspace_id=issue.workspace_id,
                    status=(
                        AutomationExecution.Status.SUCCEEDED if changed else AutomationExecution.Status.SKIPPED
                    ),
                    details={"changed": changed},
                    created_by_id=actor_id,
                    updated_by_id=actor_id,
                )
        except Exception as error:
            logger.exception("Automation rule %s failed for issue %s", rule.id, issue.id)
            AutomationExecution.objects.create(
                rule=rule,
                issue=issue,
                project_id=issue.project_id,
                workspace_id=issue.workspace_id,
                status=AutomationExecution.Status.FAILED,
                details={"error": str(error)[:1000]},
                created_by_id=actor_id,
                updated_by_id=actor_id,
            )
