from abc import ABC
from typing import Optional

from django.conf import settings
from django.utils.module_loading import import_string

from apps.base.utils import live_settings
from apps.phone_notifications.exceptions import ProviderNotSupports
from apps.phone_notifications.models import PhoneCallRecord, SMSRecord


class PhoneProvider(ABC):
    """
    PhoneProvider is an interface to all phone providers.
    It is needed to hide details of external phone providers from core code.

    New PhoneProviders should be added to settings.PHONE_PROVIDERS dict.

    For reference, you can check:
        SimplePhoneProvider as example of tiny, but working provider.
        TwilioPhoneProvider as example of complicated phone provider which supports status callbacks and gather actions.
    """

    def make_notification_call(self, number: str, text: str, phone_call_record: PhoneCallRecord):
        """
        make_notification_call makes a call to notify about alert group.

        make_notification_call is needed to be able to execute some logic only for notification calls,
        but not for test/verification/etc.
        For example receive status callback or gather digits pressed by user.
        If your provider doesn't perform any additional logic in notifications just wrap make_call:
            def make_notification_call(self, number, text, phone_call_record):
                self.make_call(number, text)

        Args:
            number: phone number to call
            text: text of the call
            phone_call_record: instance of PhoneCallRecord.
                Use it to link provider phone call and phone_call_record.
                It might be useful for receiving status callbacks and match callback data with alert group from
                phone_call_record (See TwilioPhoneProvider).
                If you can't find the use case for phone_call_record you probably don't need it,
                it's ok to omit it.

        Raises:
            FailedToMakeCall: if some exception in external provider happens
            ProviderNotSupports: if provider not supports calls (it's a valid use-case)
        """
        raise ProviderNotSupports

    def send_notification_sms(self, number: str, message: str, sms_record: SMSRecord):
        """
        send_notification_sms sends a sms to notify about alert group

        send_notification_sms is needed to execute some logic only for notification sms.
        For example receive status callback (See TwilioPhoneProvider).
        You can just wrap send_sms if no additional logic is performed for notification sms:

            def send_notification_sms(self, number, text, phone_call_record):
                self.send_sms(number, text)

        Args:
            number: phone number to send sms
            message: text of the sms
            sms_record: instance of SMSRecord.
                You can use it to link provider sms and sms_record (See TwilioPhoneProvider).


        Raises:
            FailedToSendSMS: if some exception in external provider happens
            ProviderNotSupports: if provider not supports sms (it's a valid use-case)
        """
        raise ProviderNotSupports

    def make_call(self, number: str, text: str):
        """
        make_call make a call with given text to given number.

        Args:
            number: phone number to make a call
            text: call text to deliver to user

        Raises:
            FailedToMakeCall: if some exception in external provider happens
            ProviderNotSupports: if provider not supports calls (it's a valid use-case)
        """
        raise ProviderNotSupports

    def send_sms(self, number: str, text: str):
        """
        send_sms sends an SMS to the specified phone number with the given text message.

        Args:
            number: phone number to send a sms
            text: text to deliver to user

        Raises:
            FailedToSendSMS: if some exception in external provider occurred
            ProviderNotSupports: if provider not supports calls

        """
        raise ProviderNotSupports

    def send_verification_sms(self, number: str):
        """
        send_verification_sms starts phone number verification by sending code via sms

        Args:
            number: number to verify

        Raises:
            FailedToStartVerification: if some exception in external provider occurred
            ProviderNotSupports: if concrete provider not phone number verification via sms
        """
        raise ProviderNotSupports

    def make_verification_call(self, number: str):
        """
        make_verification_call starts phone number verification by calling to user

        Args:
            number: number to verify

        Raises:
            FailedToStartVerification: if some exception in external provider occurred
            ProviderNotSupports: if concrete provider not phone number verification via call
        """
        raise ProviderNotSupports

    def finish_verification(self, number: str, code: str) -> Optional[str]:
        """
        finish_verification validates the verification code.

        Args:
             number: number to verify
             code: verification code
        Returns:
            verified phone number or None if code is invalid

        Raises:
            FailedToFinishVerification: when some exception in external service occurred
            ProviderNotSupports: if concrete provider not supports number verification
        """
        raise ProviderNotSupports


_providers = {}


def get_phone_provider() -> PhoneProvider:
    global _providers
    if len(_providers) == 0:
        for provider_alias, importpath in settings.PHONE_PROVIDERS.items():
            _providers[provider_alias] = import_string(importpath)()
    return _providers[live_settings.PHONE_PROVIDER]
