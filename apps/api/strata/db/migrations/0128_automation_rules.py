from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [("db", "0127_seed_integrations")]

    operations = [
        migrations.CreateModel(
            name="AutomationRule",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("name", models.CharField(max_length=255)),
                ("trigger", models.CharField(choices=[("issue_created", "Issue created"), ("issue_state_changed", "Issue state changed")], max_length=32)),
                ("conditions", models.JSONField(default=dict)),
                ("actions", models.JSONField(default=dict)),
                ("is_active", models.BooleanField(default=True)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="automationrule_created_by", to="db.user")),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="automationrule_updated_by", to="db.user")),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="project_automationrule", to="db.project")),
                ("workspace", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="workspace_automationrule", to="db.workspace")),
            ],
            options={"db_table": "automation_rules", "ordering": ("-created_at",)},
        ),
        migrations.CreateModel(
            name="AutomationExecution",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("status", models.CharField(choices=[("succeeded", "Succeeded"), ("skipped", "Skipped"), ("failed", "Failed")], max_length=16)),
                ("details", models.JSONField(default=dict)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="automationexecution_created_by", to="db.user")),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="automationexecution_updated_by", to="db.user")),
                ("issue", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="automation_executions", to="db.issue")),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="project_automationexecution", to="db.project")),
                ("rule", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="executions", to="db.automationrule")),
                ("workspace", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="workspace_automationexecution", to="db.workspace")),
            ],
            options={"db_table": "automation_executions", "ordering": ("-created_at",)},
        ),
    ]
