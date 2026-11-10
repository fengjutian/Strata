from rest_framework import serializers

from strata.db.models import AutomationRule, Label, ProjectMember, State

from .base import BaseSerializer


class AutomationRuleSerializer(BaseSerializer):
    class Meta:
        model = AutomationRule
        fields = "__all__"
        read_only_fields = ["workspace", "project", "deleted_at", "created_by", "updated_by"]

    def validate_conditions(self, value):
        allowed = {"priority", "state_id"}
        unknown = set(value) - allowed
        if unknown:
            raise serializers.ValidationError(f"Unsupported conditions: {', '.join(sorted(unknown))}")
        if "priority" in value and value["priority"] not in {"none", "urgent", "high", "medium", "low"}:
            raise serializers.ValidationError("Invalid priority condition")
        if "state_id" in value and not State.objects.filter(
            id=value["state_id"], project_id=self.context["project_id"]
        ).exists():
            raise serializers.ValidationError("State does not belong to this project")
        return value

    def validate_actions(self, value):
        allowed = {"priority", "assignee_ids", "label_ids"}
        unknown = set(value) - allowed
        if unknown:
            raise serializers.ValidationError(f"Unsupported actions: {', '.join(sorted(unknown))}")
        if not value:
            raise serializers.ValidationError("At least one action is required")
        if "priority" in value and value["priority"] not in {"none", "urgent", "high", "medium", "low"}:
            raise serializers.ValidationError("Invalid priority action")

        project_id = self.context["project_id"]
        assignee_ids = set(value.get("assignee_ids", []))
        valid_assignees = set(
            ProjectMember.objects.filter(
                project_id=project_id, member_id__in=assignee_ids, is_active=True, role__gte=15
            ).values_list("member_id", flat=True)
        )
        if {str(item) for item in valid_assignees} != {str(item) for item in assignee_ids}:
            raise serializers.ValidationError("Every assignee must be an active project member")

        label_ids = set(value.get("label_ids", []))
        valid_labels = set(Label.objects.filter(project_id=project_id, id__in=label_ids).values_list("id", flat=True))
        if {str(item) for item in valid_labels} != {str(item) for item in label_ids}:
            raise serializers.ValidationError("Every label must belong to this project")
        return value
