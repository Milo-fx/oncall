# Generated by Django 3.2.18 on 2023-04-18 05:03

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('alerts', '0013_merge_20230418_0336'),
    ]

    operations = [
        migrations.AddField(
            model_name='alertreceivechannel',
            name='restricted_at',
            field=models.DateTimeField(default=None, null=True),
        ),
    ]
