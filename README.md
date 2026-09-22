# WHO

WHO is a caller-intelligence and communication app created by Squashberry.

This repository contains the public WHO website and the first administration dashboard shell.

## Website

The site is designed as a static GitHub Pages experience with:

- Premium dark + blue WHO visual system
- Responsive landing page
- Android / Google Play, iPhone, iPad, macOS and Windows platform cards
- Caller intelligence product section
- Google Drive backup / restore product section
- WHO Beta 1.0 messaging
- Responsive mobile navigation
- /admin/ administration dashboard shell

The public site is intentionally self-contained: there are no required external JavaScript libraries.

## Admin

/admin/ is currently **preview mode**.

It contains the planned control-center structure for:

- Overview
- Users
- Caller Intelligence
- Reports & Spam
- Releases
- Remote Config
- Announcements
- Backups
- Feedback
- Analytics
- Settings
- Audit Log

The admin frontend must be connected to the real WHO API before operational controls or user data are exposed.

Do not put database passwords, service credentials, API secrets, or private OAuth credentials in this repository.

## GitHub Pages

The repository includes .github/workflows/pages.yml.

On GitHub, open:

Settings → Pages → Build and deployment

and select **GitHub Actions** as the Pages source if GitHub has not already enabled it for the repository.

The expected project-site URL is:

https://squashberry.github.io/who/

## Next backend milestone

The mobile app and admin panel should share a dedicated WHO backend. The backend will eventually provide:

- Remote app configuration
- Force-update version control
- Revisioned beta announcements
- User/account records
- Caller-intelligence matching
- Community identity observations
- Spam/reputation reports
- Release/download metadata
- Aggregated analytics
- Admin audit logs
- Google OAuth / Drive backup integration

Contact intelligence should be designed around explicit consent, normalization, confidence scoring, correction/report flows and data minimization. A suggested name should be treated as a confidence-based community signal, not automatically as verified legal identity.

## Design reference

The visual direction takes high-level inspiration from modern caller-ID products: large editorial hero sections, app/device previews, strong download calls-to-action and feature storytelling. WHO uses its own layout, colors, copy and component styling.
