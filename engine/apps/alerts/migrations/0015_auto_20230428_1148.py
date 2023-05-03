# Generated by Django 3.2.18 on 2023-04-28 11:48

from django.db import migrations
from django.db.models import Q
from apps.base.messaging import get_messaging_backends


def set_field_if_web_template_is_not_default(apps, schema_editor):
    """Save current default templates to DB if web templates are not default
    to avoid using default templates in the future, as default templates will be dependant on web templates
    We need to gurantee that new default templates only dependant on newer web templates
    and this change won't break existing alert receive channels
    """
    # TODO: remove import as it is used for local testing only
    from django.apps import apps

    AlertReceiveChannel = apps.get_model("alerts", "AlertReceiveChannel")
    alert_receive_channels_with_non_default_web_templates = (
        AlertReceiveChannel.objects.filter(
            Q(web_title_template__isnull=False)
            | Q(web_message_template__isnull=False)
            | Q(web_image_url_template__isnull=False)
        )
    )
    for alert_receive_channel in alert_receive_channels_with_non_default_web_templates:
        # Core templates (pre-messaging backends)
        core_templates = [
            "slack_title_template",
            "slack_message_template",
            "slack_image_url_template",
            "telegram_title_template",
            "telegram_message_template",
            "telegram_image_url_template",
            "sms_title_template",
            "phone_call_title_template",
        ]
        for template_name in core_templates:
            value = getattr(alert_receive_channel, template_name)
            if not value:
                # Value is not set, set it to default
                defaults = getattr(
                    alert_receive_channel,
                    f"INTEGRATION_TO_DEFAULT_{template_name.upper()}",
                    {},
                )
                value = defaults.get(alert_receive_channel.integration)
                print(f"{alert_receive_channel}: Setting {template_name}: {value}")
                # TODO: uncomment to save
                # setattr(alert_receive_channel, template_name, value)
                # alert_receive_channel.save()
        # Messaging backend templates
        messaging_backends_templates = {}
        for backend_id, backend in get_messaging_backends():
            if not backend.customizable_templates:
                continue
            backend_templates = alert_receive_channel.messaging_backends_templates.get(
                backend_id, {}
            )
            for field in backend.template_fields:
                value = backend_templates.get(field, None)
                if not value:
                    # Value is not set, set it to default in backend_templates
                    value = alert_receive_channel.get_default_template_attribute(
                        backend_id, field
                    )
                    backend_templates[field] = value
            messaging_backends_templates[backend_id] = backend_templates
        print(
            f"{alert_receive_channel}: Setting messaging_backend_templates: \n {messaging_backends_templates}"
        )
        # TODO: uncomment to save
        # alert_receive_channel.messaging_backends_templates = messaging_backend_templates
        # alert_receive_channel.save()


class Migration(migrations.Migration):
    dependencies = [
        ("alerts", "0014_alertreceivechannel_restricted_at"),
    ]

    operations = [
        # TODO: uncomment
        # migrations.RunPython(),
    ]
