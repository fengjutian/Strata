from django.db import migrations

# The providers the web client knows how to render. The client looks these
# up by `provider` slug (see components/integration/single-integration-card.tsx),
# so a row with an unknown slug would render without a logo.
#
# `title` and `description` are shown verbatim in the settings page, so they
# are written in English here for consistency with the rest of the seeded
# catalogue; the surrounding UI is translated, but this text is instance
# data rather than UI chrome.
INTEGRATIONS = [
    {
        "provider": "github",
        "title": "GitHub",
        "network": 2,
        "author": "GitHub",
        "verified": True,
        "description": {
            "description": "Sync work items with GitHub repositories and keep issues in both systems aligned.",
        },
        "metadata": {},
    },
    {
        "provider": "slack",
        "title": "Slack",
        "network": 2,
        "author": "Slack",
        "verified": True,
        "description": {
            "description": "Send work item updates to a Slack channel and turn conversations into work items.",
        },
        "metadata": {},
    },
]


def seed_integrations(apps, schema_editor):
    """Insert the catalogue of supported providers.

    Idempotent: `provider` is unique, so a row that already exists is left
    untouched rather than raising. This matters because the catalogue is
    instance data that an admin may have edited (title, description), and a
    re-run of this migration must not clobber those edits.
    """
    Integration = apps.get_model("db", "Integration")

    for integration in INTEGRATIONS:
        Integration.objects.get_or_create(
            provider=integration["provider"],
            defaults={
                "title": integration["title"],
                "network": integration["network"],
                "author": integration["author"],
                "verified": integration["verified"],
                "description": integration["description"],
                "metadata": integration["metadata"],
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        ("db", "0126_profile_language_default_chinese"),
    ]

    operations = [
        migrations.RunPython(seed_integrations, migrations.RunPython.noop),
    ]
