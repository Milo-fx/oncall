# Generated by Django 3.2.18 on 2023-05-24 03:54

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('phone_notifications', '0001_initial'),
        ('twilioapp', '0003_auto_20230408_0711'),
    ]

    operations = [
        migrations.CreateModel(
            name='TwilioSMS',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.PositiveSmallIntegerField(blank=True, choices=[(10, 'accepted'), (20, 'queued'), (30, 'sending'), (40, 'sent'), (50, 'failed'), (60, 'delivered'), (70, 'undelivered'), (80, 'receiving'), (90, 'received'), (100, 'read')], null=True)),
                ('sid', models.CharField(blank=True, max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('sms_record', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='twilioapp_twiliosms_related', related_query_name='twilioapp_twiliosmss', to='phone_notifications.smsrecord')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='TwilioPhoneCall',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.PositiveSmallIntegerField(blank=True, choices=[(10, 'queued'), (20, 'ringing'), (30, 'in-progress'), (40, 'completed'), (50, 'busy'), (60, 'failed'), (70, 'no-answer'), (80, 'canceled')], null=True)),
                ('sid', models.CharField(blank=True, max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('phone_call_record', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='twilio_phone_call', to='phone_notifications.phonecallrecord')),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
