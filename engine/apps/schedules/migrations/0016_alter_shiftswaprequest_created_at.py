# Generated by Django 3.2.20 on 2023-08-01 18:16

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('schedules', '0015_shiftswaprequest_slack_message'),
    ]

    operations = [
        migrations.AlterField(
            model_name='shiftswaprequest',
            name='created_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]
