# misha-katya-invitation

## RSVP emails on Vercel

This project sends RSVP confirmations through Resend.

Set this environment variable in Vercel:

- `RESEND_API_KEY`

The email is sent from `onboarding@resend.dev` to `belitskayaekaterinka@yandex.ru`.
If Resend rejects the message, the recipient email must match the email address on the Resend account, or you need to verify your own domain in Resend and update the sender address in `api/rsvp.js`.
