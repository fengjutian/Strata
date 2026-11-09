from django.db import migrations, models

DEFAULT_LANGUAGE = "zh-CN"
LEGACY_DEFAULT_LANGUAGE = "en"


def switch_to_chinese_default(apps, schema_editor):
    """Move profiles still on the old English default to the new Chinese default.

    Profiles created before this change store `language="en"`, either because nobody picked a
    language or because the owner picked English. The two cases cannot be told apart in the data, so
    everything on "en" is switched; picking English in the profile settings writes an explicit value
    that later migrations leave alone.
    """
    Profile = apps.get_model("db", "Profile")
    Profile.objects.filter(language=LEGACY_DEFAULT_LANGUAGE).update(language=DEFAULT_LANGUAGE)


class Migration(migrations.Migration):
    dependencies = [
        ("db", "0125_reset_project_deploy_board_identity"),
    ]

    operations = [
        migrations.AlterField(
            model_name="profile",
            name="language",
            field=models.CharField(default=DEFAULT_LANGUAGE, max_length=255),
        ),
        migrations.RunPython(switch_to_chinese_default, migrations.RunPython.noop),
    ]
