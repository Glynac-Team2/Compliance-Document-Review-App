import resend

from app.config import settings


class EmailService:
    def __init__(self, api_key: str) -> None:
        resend.api_key = api_key
        self._from = settings.from_address

    def _send_email(self, subject: str, to: list[str], html: str) -> None:
        resend.Emails.send(
            {
                "from": self._from,
                "to": to,
                "subject": subject,
                "html": html,
            }
        )

    def send_reset_email(self, to: str, link: str) -> None:
        self._send_email(
            subject="[Compliance] Reset your password",
            to=[to],
            html=f'<p>Click <a href="{link}">here</a> to reset your password. '
            f"This link expires in 30 minutes.</p>",
        )


email_service = EmailService(api_key=settings.resend_api_key)
