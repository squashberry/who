# WHO — Website Archive / Build Handoff

> **ARCHIVE NOTE — October 5, 2026**
>
> The current WHO website is being retired and rebuilt from a completely different design and interaction model.
>
> This README is intentionally an **archive / migration handoff**, not the final public-site README.
>
> It records the product knowledge, live integrations, URLs, authentication contracts, operational controls, content, UX decisions, known problems, and migration requirements worth carrying into the new build.
>
> **Before this repository is made public again or reused as the new website, remove the temporary internal sections marked `INTERNAL / REMOVE LATER`.**
>
> **Never paste real passwords, private keys, OAuth client secrets, service-role keys, database credentials, signing keys, or API secrets into this README.** This repository is public, and Git history is persistent. A deleted secret is still compromised if it was ever committed.

---

## 1. Product identity

- Product: **WHO**
- Brand owner / creator: **Squashberry**
- Core question: **"Who is trying to reach you?"**
- Current product positioning: caller intelligence + phone/calling + contacts + SMS + Relay + network tools.
- Current public beta label: **WHO Beta 1.0**
- Current public phone platform: **Android**
- Desktop direction: **WHO PC**
- Current public site: `https://squashberry.github.io/who/`
- Current backend origin used by the website: `https://who-api.who-fe3.workers.dev`
- Companion mobile app repository: `https://github.com/squashberry/who-app`

### Product principles worth carrying

1. Caller intelligence is **context, not certainty**.
2. A suggested caller identity should be treated as a **confidence-based signal**, not verified legal identity.
3. Contacts belong to the user; a private address book should never silently become a public directory.
4. Community intelligence should favor **quality, independent signals, moderation, correction and visible uncertainty** rather than raw volume.
5. Users remain responsible for deciding whether to answer, ignore, block or report a call.
6. Never imply that Caller ID, spam labels or a VPN make a person completely safe or anonymous.
7. Backup data and community/caller-intelligence data should remain **separate systems**.
8. Sensitive operations should use least privilege, explicit consent and auditable actions.

---

## 2. Existing website architecture

The current site is a mostly static GitHub Pages application.

### Current technical shape

- Plain HTML
- Plain CSS
- Plain JavaScript
- No package manager or frontend build system in the website repo
- No GSAP
- No Three.js
- No Spline
- No Lottie
- CSS-only pseudo-3D device mockups
- Hash-based SPA-like switching on the home page
- Separate static HTML pages for guides, legal, support and marketing content
- Custom analytics client
- Live backend API calls
- WHO Control admin dashboard under `/admin/`
- Desktop authorization flow under `/device-login/`
- Legacy desktop account flow still present at `/account.html`

### Main client files

- `index.html` — main landing page + home sections + feature/Relay/network/feedback/install screens
- `app.css` — primary marketing-site styling and responsive system
- `app.js` — home-page navigation, beta popup, feedback rendering, boot sequence
- `analytics.js` — custom analytics + theme preference + visitor/session identifiers
- `site-pages.css` — shared styling for secondary content pages
- `download.html` — Android download + PC placeholder
- `feedback.html` — public beta feedback form
- `data/approved-feedback.json` — approved public-feedback feed; currently `[]`
- `.github/workflows/pages.yml` — GitHub Pages deployment
- `robots.txt` — blocks crawler indexing of `/admin/`
- `sitemap.xml` — public URL inventory
- `favicon.svg` — current WHO icon
- `share.svg` — current Open Graph/share image

---

## 3. Current visual system

### Existing visual language

- Dark navy / near-black base
- Blue and cyan primary accents
- Violet used in some secondary cards
- Glassmorphism
- Blurred ambient glows
- Grid/noise overlays
- Large editorial typography
- Floating phone mockups
- Bento feature cards
- Fixed glass navigation
- Responsive mobile bottom navigation

### Important current colors

- Background: approximately `#060812`
- Secondary dark background: approximately `#090d19`
- Primary blue: `#1687ff`
- Light blue: `#70ccff`
- Cyan: `#4be1ff`
- Violet: `#9d86ff`
- Danger: `#ff6585`

### Current positioning / copy

Current home headline:
**"Your phone, understood."**

Current product description:
WHO combines caller intelligence, real calling, contacts, messages, spam protection, WHO Relay and private network tools.

Current CTA direction:
- Get WHO
- Explore the experience
- View downloads
- Leave feedback

### Existing brand asset

The current favicon is a blue gradient square with the white WHO mark. The same visual is reused in the share image and UI boot screens.

---

## 4. Current boot / preloader

The existing site already has a small preloader.

### Existing sequence

- Full-screen dark background
- WHO icon
- "Starting WHO"
- "Loading your phone experience"
- Horizontal progress bar
- Status text
- Percentage
- Fade/scale transition into the site
- Reduced-motion handling

### Important implementation detail

The current progress sequence is **time-based / simulated**, not true asset-loading progress.

Current sequence roughly progresses through:
- Preparing WHO
- Loading interface
- Preparing phone tools
- Connecting WHO features
- Finishing setup
- WHO is ready

### New build recommendation

Replace this completely with the new cinematic boot experience described below.

Do not carry the fake progress percentages into the new design. If a percentage is displayed, it should represent real loading/initialization work or a short cinematic sequence whose copy makes it clear that it is a branded launch sequence.

---

## 5. Current home page experience

The existing homepage contains:

### Hero

- Beta pill
- "Your phone, understood."
- Caller intelligence / calling / contacts / messages / Relay / VPN positioning
- Get WHO CTA
- Explore CTA
- Two CSS-generated floating phone mockups
- Floating Relay card
- Floating network/VPN card

### Story section

Four scenarios:

1. Before you answer — Caller ID
2. When you need to call — Dialer
3. When a second phone needs internet — WHO Relay
4. When you want a network tunnel — WHO Network

### Getting-started section

- Android-first positioning
- Download
- Grant required permissions
- Set WHO as default phone app
- Try Relay / VPN

### Guides section

- How to use WHO
- Pair two WHO phones
- Connect the network tunnel

### Beta section

- First 50 beta users
- Android beta
- Relay + VPN
- Feedback CTA

### Feedback area

- Approved-only public feedback
- Public feed generated from `data/approved-feedback.json`

### Install section

- Android Beta 1.0
- WHO PC companion
- PC currently says coming soon

---

## 6. Feature concepts currently represented by the website

The new website should preserve the underlying product truth even if the visual storytelling becomes completely different.

### Caller intelligence

- Incoming number can be compared against local contacts and available caller-intelligence signals.
- Community / observed signals can be shown with confidence.
- Incorrect labels should be reportable/correctable.
- Caller context is not proof of identity.
- The product is intentionally **not** a public reverse-phone-lookup website.

### Dialer / calls

- WHO can be the default phone/dialer app on supported Android devices.
- Recents
- Contacts
- Keypad
- Call actions
- Multi-SIM where exposed by the device

### SMS / messaging

- SMS belongs inside the phone communication experience.
- Future direction includes sender context, spam filtering and message categorization.
- Privacy handling of message content must remain explicit.

### Spam protection

- Recognize available context
- Report unwanted/suspicious calls
- Block / ignore when supported
- Do not claim every unknown number is spam
- Familiar-looking identities can still be wrong or spoofed

### WHO Relay

- One WHO Android device acts as Host / Share.
- Another acts as Receive.
- Session uses a fresh pairing credential/code.
- Nearby discovery is part of the intended flow.
- Manual code entry is a fallback.
- Receiver can use WHO's native VPN/tun2socks path when available.
- Session state and traffic information are visible.
- Normal Android hotspot can conflict with Relay and may need to be disabled.
- Relay should never silently turn off a user's ordinary hotspot.
- PC Relay exists as a separate documented use case.

### WHO PC Relay

Current documented compatibility path:

1. Android phone with working internet = Host
2. Start Ultra Relay on WHO
3. Windows PC connects to the compatibility hotspot
4. WHO PC finds the Relay service on the local network
5. Current pairing code is entered
6. PC traffic is routed through the phone session
7. Disconnecting the Relay should restore the previous network path

Ultra Relay is documented as a compatibility mode for older Windows Wi-Fi adapters using a WPA2-Personal hotspot.

### WHO Network / VPN

- Native Android VPN / tun2socks path
- Endpoint information
- Country
- Protocol
- Latency
- Uptime
- Protected / active state
- Android VPN permission prompt
- Only one active VPN service may be allowed by some devices
- VPN must never be marketed as anonymity

### Google Drive backup

Planned / product direction:

- Explicit Google authorization
- User-controlled backup and restore
- Backup should remain separate from caller-intelligence data
- Encrypt backup material before upload
- Revoking Google authorization does not automatically delete an existing Drive backup

---

## 7. Current desktop authentication / authorization flow

This is one of the most important things to preserve.

### Primary desktop page

`/device-login/`

The desktop signs in by pairing through a short-lived code, normally obtained from the WHO PC application / QR flow.

### Current backend contract

API origin:

`https://who-api.who-fe3.workers.dev`

Pairing lookup:

`GET /desktop/pair/request/<pairingCode>`

After account verification, explicit desktop authorization:

`POST /desktop/pair/request/<pairingCode>/authorize`

Authorization uses:

`Authorization: Bearer <accountToken>`

### Manual WHO account flow

Request confirmation code:

`POST /auth/request-code`

Verify confirmation code:

`POST /auth/verify-code`

The manual flow uses a six-digit email confirmation code.

### Existing-account detection

The current desktop flow contains an explicit account-missing path.

An account is treated as missing when the backend responds with a 404 or a matching account/user-not-found response. The page then tells the user that a WHO account was not found and offers account creation.

This must be preserved.

**Do not silently create a second account when an existing account is expected.**

### Current Google sign-in flow

Desktop authorization can also use Google Identity Services.

Google verification endpoint:

`POST /auth/google`

The backend can request a Gambia phone number to finish a new account.

### Public Google configuration

Current frontend Google OAuth client ID:

`207148022166-rn08uvr7cv28cck5i9n7r92qini3g8oh.apps.googleusercontent.com`

**This is a public OAuth client identifier, not an OAuth client secret.**

The Google client secret must never be placed in the website.

### Phone validation currently expected by the desktop flow

The active desktop Google completion path expects a Gambia mobile number consisting of 9 local digits.

The old legacy account page documents accepted normalized forms such as:

- 9 local digits
- 220 + 9 digits
- +220 + 9 digits
- 00220 + 9 digits

The definitive validation should remain in the backend, not only in JavaScript.

---

## 8. Legacy `/account.html`

`/account.html` still exists in the current repo, but the newer product direction routes desktop authorization through `/device-login/`.

It is therefore a **legacy compatibility page**.

It contains:

- WHO desktop sign-in UI
- Email confirmation code flow
- Account creation flow
- Explicit "WHO account not found" state
- Desktop pairing authorization
- No Google sign-in in the older implementation
- `noindex,nofollow,noarchive`
- Cache-control headers intended to prevent stale auth pages

### Migration decision

Do not build the new public website around `account.html`.

Keep its useful behavior as a reference only, especially:

- account-missing detection
- explicit sign-in vs create-account distinction
- pairing authorization state
- no-store behavior on auth pages

---

## 9. Feedback system

Public page:

`/feedback.html`

Submit endpoint:

`POST https://who-api.who-fe3.workers.dev/feedback`

Current payload shape:

```json
{
  "name": "",
  "email": "",
  "category": "General feedback",
  "message": "",
  "appVersion": "1.0.0",
  "platform": "Android"
}
```

The front end also appends:

- reproduction steps
- rating
- whether public display was requested

### Review workflow

1. User submits feedback
2. Backend stores it
3. Admin reviews it
4. Admin can approve / reject / reopen
5. Only approved feedback is shown publicly

Current public data file:

`data/approved-feedback.json`

Current contents:

`[]`

### New-build recommendation

Keep the workflow, but improve:

- abuse/rate limiting
- submission states
- privacy messaging
- clear success / retry states
- optional screenshot or diagnostics attachment later
- better public review presentation

---

## 10. Custom website analytics

The current public site does have custom analytics.

That matters because the old Cookie Policy says the public GitHub Pages site does not currently require an advertising tracker, but there is still first-party analytics collection.

### Current analytics API

`https://who-api.who-fe3.workers.dev/analytics/collect`

### Event types currently used

- `page_view`
- `download_start`

### Browser identifiers

Local visitor key:

`who-web-visitor-id-v1`

Session key:

`who-web-session-id-v1`

Visitor ID is generated with `crypto.randomUUID()` when available.

Session ID is kept in session storage.

### Data sent

Current event payload can include:

- event type
- visitor ID
- session ID
- path
- page title
- referrer hostname
- platform
- source
- metadata

### Current download tracking

Android download clicks emit:

`download_start`

with the version, currently `1.0.0`.

### Migration warning

The new privacy/cookie documentation must match the actual implementation.

Do not claim "no analytics" if analytics remain.

---

## 11. WHO Control admin dashboard

Path:

`/admin/`

This is no longer merely the old visual "preview" shell. The current dashboard is wired to the live WHO API.

### Admin sections

- Overview
- Users
- Caller intelligence
- Website analytics
- Reports
- Releases
- Remote config
- Announcements
- Crashes
- Feedback
- Audit

### Current authentication

Admin login:

`POST /admin/login`

Admin session check:

`GET /admin/session`

Admin logout:

`POST /admin/logout`

Admin bearer token is held in browser session storage under:

`who_admin_token`

### Current live operational endpoints

Runtime configuration:

- `GET /admin/config`
- `PATCH /admin/config`

General live metrics:

- `GET /admin/stats`

Download analytics:

- `GET /admin/download-stats?range=<days>`

Website analytics:

- `GET /admin/website-stats?range=<days>`

Crashes:

- `GET /admin/crashes?limit=200`
- `PATCH /admin/crashes/<id>`

Reports:

- `GET /admin/reports`
- `PATCH /admin/reports/<id>`

Feedback:

- `GET /admin/feedback`
- `PATCH /admin/feedback/<id>`

Audit:

- `GET /admin/audit`

### Current data sources implied by the dashboard

- WHO D1 for user/device/report/crash/audit operational data
- Supabase for anonymized caller-intelligence metrics

### Current admin capabilities

#### Releases / remote configuration

Current config can carry:

- application version
- latest version
- minimum supported version
- force-update toggle
- update URL
- force-update title/message/button
- soft-update title/message/button/later action
- welcome-message controls
- welcome revision
- maintenance mode
- maintenance title/message
- announcement enabled/title/message/button/revision
- crash-report URL

### Operational value worth carrying

The new architecture should preserve the ability for the admin side to remotely control:

- app version gates
- maintenance
- announcements
- welcome/onboarding copy
- public site metrics
- feedback moderation
- report moderation
- crash triage
- audit history

---

## 12. Admin PWA

The admin panel contains an installable web-app setup.

Manifest:

`admin/site.webmanifest`

Service worker:

`admin/sw.js`

Current service-worker cache name:

`who-admin-v6`

The service worker caches the admin shell and WHO icon assets.

### Important architecture conflict in the old site

The main public `app.js` contains code that unregisters **all service-worker registrations visible to the page**.

The admin app separately registers its own service worker.

That is a bad boundary for the new site.

**New architecture: public site, admin app and any authenticated app-like pages must not blindly unregister each other's service workers.**

---

## 13. GitHub Pages deployment

Workflow:

`.github/workflows/pages.yml`

The current workflow:

- runs on pushes to `main`
- supports manual workflow dispatch
- uses GitHub Pages
- uses `actions/checkout@v4`
- uses `actions/configure-pages@v5`
- uploads the entire repository root using `actions/upload-pages-artifact@v3`
- deploys with `actions/deploy-pages@v4`

### Important security observation

The current workflow uploads:

`path: .`

That means the whole repository root is part of the Pages artifact.

The new website should use a deliberate build output directory such as `dist/` so private source material, development files and internal documentation are not automatically published.

### Existing Pages URL

`https://squashberry.github.io/who/`

No current `CNAME` file was found in the default branch.

---

## 14. SEO / robots / sitemap

### robots.txt

Current:

```
User-agent: *
Disallow: /admin/

Sitemap: https://squashberry.github.io/who/sitemap.xml
```

Important:

**robots.txt is not access control.**

The admin API authentication must be the real protection.

### Sitemap pages currently represented

- /
- /features.html
- /how-it-works.html
- /how-to-use-who.html
- /how-to-use-relay.html
- /how-to-use-vpn.html
- /caller-id.html
- /spam-blocking.html
- /scam-alert.html
- /reverse-phone-lookup.html
- /sms.html
- /contacts.html
- /premium.html
- /community.html
- /safety-center.html
- /faq.html
- /support.html
- /feedback.html
- /download.html
- /about.html
- /impact.html
- /developers.html
- /privacy.html
- /how-we-use-your-info.html
- /data-choices.html
- /terms.html
- /cookies.html
- /community-guidelines.html
- /responsible-disclosure.html
- /contact.html

### Sitemap issue

`how-to-use-pc-relay.html` exists but is not in the current sitemap.

The new build should generate the sitemap from the actual routes instead of maintaining this by hand.

---

## 15. Existing content / legal inventory

### Product / education

- `features.html`
- `how-it-works.html`
- `how-to-use-who.html`
- `how-to-use-relay.html`
- `how-to-use-vpn.html`
- `how-to-use-pc-relay.html`
- `caller-id.html`
- `spam-blocking.html`
- `scam-alert.html`
- `reverse-phone-lookup.html`
- `sms.html`
- `contacts.html`
- `premium.html`
- `community.html`
- `impact.html`
- `developers.html`

### Support / trust

- `safety-center.html`
- `faq.html`
- `support.html`
- `feedback.html`
- `contact.html`
- `responsible-disclosure.html`

### Privacy / legal

- `privacy.html`
- `how-we-use-your-info.html`
- `data-choices.html`
- `cookies.html`
- `community-guidelines.html`
- `terms.html`

### Utility

- `download.html`
- `404.html`
- `account.html`
- `device-login/index.html`
- `/admin/`

### Legal status

The current Privacy Policy and Terms are explicitly written as beta/product drafts and should receive jurisdiction-specific review before a broad production launch or monetization.

---

## 16. Current legal / privacy principles worth preserving

### Privacy

The current policy says WHO may process:

- account/sign-in details
- display name
- phone number
- authentication identifiers
- voluntary feedback/support/report data
- app/version/device/OS diagnostics
- security/reliability events
- intentionally submitted caller/spam reports

The future community identity layer is described as:

- authorized
- confidence based
- minimized
- subject to correction
- subject to opt-out controls
- separate from the user's private contact list

### Important promise

Do not silently turn a user's private address book into a public directory.

### Backup promise

Google Drive backups should:

- require explicit authorization
- be separate from public caller-intelligence data
- be encrypted before upload
- remain user-controlled

### Safety promise

WHO should never tell a user that an identity badge is proof.

Never encourage users to trust:

- OTP requests
- banking PIN requests
- passwords
- recovery codes
- suspicious download links

simply because Caller ID displays a recognizable name.

---

## 17. Current support / contact endpoint

Public support address:

`squashberrypro@gmail.com`

Current site uses it for:

- support
- privacy requests
- community appeals
- security disclosure
- general contact

New site can preserve the address, but should eventually route trust/security/legal issues through clearer dedicated forms or controlled inboxes.

---

## 18. Current Android download / release linkage

Current Android download page points directly to:

`https://raw.githubusercontent.com/squashberry/who-app/main/WHO-v1.0.0.apk`

Companion app repository:

`https://github.com/squashberry/who-app`

The website also links to the companion GitHub repository.

### Problem

The public website hardcodes:

`1.0.0`

in multiple places.

### Better new architecture

The new website should consume release metadata or a single configuration source so:

- latest version
- minimum version
- APK URL
- release notes
- checksums
- platform availability

do not have to be edited in several HTML files.

---

## 19. Existing current share / social image

`share.svg` is a 1200×630 Open Graph image containing:

- WHO mark
- WHO Beta 1.0
- "Your phone, understood."
- caller intelligence / calling / SMS / Relay / network tools
- phone preview
- current GitHub Pages URL

### Migration

Replace it completely with the new visual identity of the rebuilt site.

---

## 20. Important current UX states

Carry these states conceptually even if the UI changes completely:

### Authentication

- Initial loading
- Pairing code missing
- Pairing code invalid/expired
- Checking desktop identity
- Account exists
- Account does not exist
- Create account
- Sending code
- Code sent
- Invalid code
- Session verified
- Explicit desktop authorization
- Authorization cancelled
- Authorization complete
- Network failure
- Backend unavailable

### Website

- Initial boot
- Reduced motion
- Low bandwidth
- WebGL unavailable
- Animation skipped
- Download starting
- Download unavailable
- Feedback submitting
- Feedback success
- Feedback error
- Route/page not found

### Admin

- Not authenticated
- Authenticated
- API unavailable
- Maintenance
- Force update
- Pending reports
- Pending crashes
- Pending feedback
- Healthy / no operational queue
- Remote configuration changed
- Announcement published

---

## 21. Known problems / contradictions to fix in the new build

### 1. Fake preloader progress

The current bar is simulated by timers.

**Fix:** either use real asset progress or make the branded boot sequence explicitly cinematic.

### 2. Public repo + full-root Pages upload

The current Pages workflow uploads the whole root.

**Fix:** build into a clean `dist/` folder.

### 3. Admin protection relies on backend auth, but the page itself is public

robots.txt only hides it from search engines.

**Fix:** keep the page routable if desired, but make the backend the security boundary and consider putting the admin application on a dedicated origin.

### 4. Cookie/privacy copy versus custom analytics

The site currently performs first-party visitor/session analytics.

**Fix:** make privacy/cookie disclosures match actual behavior.

### 5. Sitemap drift

PC Relay exists but is absent from sitemap.

**Fix:** generate sitemap from the route manifest.

### 6. Mixed architecture

Home is hash-routed while many pages are separate HTML files.

**Fix:** choose one routing architecture.

### 7. Hardcoded version number

`1.0.0` is duplicated in multiple places.

**Fix:** centralize release metadata.

### 8. Main site service-worker unregistration

The public app script unregisters all visible service workers.

**Fix:** scope service-worker ownership.

### 9. Theme system and first paint

Some secondary pages support a theme-control system injected from `analytics.js`, while the primary home page is built around a mostly dark shell and its boot layer is hard-coded dark.

**Fix:** new theme strategy must be deliberate from first paint.

### 10. CSS mock 3D is not actual 3D

The phones currently look 3D because of CSS transforms and gradients.

**Fix:** the new design can use true WebGL / 3D if the performance budget allows it.

### 11. Current site has no clear true build pipeline

Everything is effectively deployed as source.

**Fix:** build, optimize, hash assets, generate routes and publish only the production artifact.

### 12. Support page is inconsistent with analytics inclusion

Most content pages include `analytics.js`; `support.html` currently does not.

**Fix:** centralize analytics behavior rather than manually adding it page-by-page.

---

## 22. Current secrets / credentials inventory

> **DO NOT PUT ACTUAL SECRET VALUES HERE.**
>
> This section exists only so the next build knows what kinds of credentials must survive the migration and where they belong.

### Public configuration — safe to expose

- WHO API origin: `https://who-api.who-fe3.workers.dev`
- Google OAuth **client ID** shown in `device-login/index.html`
- Public support email
- Public GitHub repositories
- Public APK/release URLs
- Public Pages URL

### Secret material that belongs outside the website repository

#### WHO admin password / verifier

Used by:

`POST /admin/login`

The frontend does **not** contain the actual password in the current default-branch client code.

Store it only in the backend's secure secret/configuration system.

#### Google OAuth client secret

The frontend only needs the public OAuth client ID.

The OAuth client secret must remain in the backend / Google Cloud configuration.

#### Backend authentication/session signing secrets

The backend issues session/access tokens.

Whatever signing, encryption or token-verification material the API uses belongs only in the backend secret store.

#### Database credentials

The website references live backend systems that use WHO operational storage.

Database passwords, service credentials and service-role keys must remain server-side.

#### Caller-intelligence data credentials

Any Supabase project service key, database service key, storage key or privileged query credential must remain server-side.

#### Mail / OTP provider credentials

The current site triggers account confirmation-code behavior through the API.

The provider credentials used by the backend must never be placed in the public website.

#### Analytics write / management secrets

The public site only needs its collection endpoint.

Any privileged analytics query credentials must remain server-side.

#### Release signing keys

Android signing material must never live in the public website repo.

---

## 23. Secret rotation rule before deletion/rebuild

Deleting the website or deleting a secret-containing file is **not** enough if the secret was ever committed.

Before reusing this repository for a public build:

1. Search the full Git history for passwords, API tokens, private keys and credential files.
2. Rotate any credential that was ever committed.
3. Remove the compromised value from backend/frontend sources.
4. Re-check the default branch.
5. Use a secret manager / platform secret store for runtime credentials.
6. Make the build output contain only public configuration.

A public Git repository should be treated as permanently public.

---

## 24. Current Git history notes

Recent work immediately before this rebuild included:

- live WHO Control operational dashboard
- command palette
- operational attention panel
- live website analytics
- live download statistics
- Google sign-in for desktop authorization
- desktop pairing flow
- account-missing detection
- WHO PC Ultra Relay guide
- remote config / announcements
- crash queue
- report moderation
- feedback moderation
- audit logging

A historical commit restored the admin password login **UI**, but the current website frontend does not contain the actual admin password.

No actual secret value was found in the specific current/default-branch files inspected during this audit.

That is **not** a guarantee that no secret ever existed in Git history or backend configuration. Treat the backend credential store and Git history as separate audits.

---

## 25. New website direction — recommended

The proposed **Game-Style Splash + 3D Interactive WHO site** is a strong direction.

I would keep the energy but make it feel like a **security product that launches like a game**, not a gaming website pretending to be a phone product.

### Core concept

**WHO // SYSTEM ONLINE**

The visitor is entering the WHO system.

The website should feel like they are booting the product itself.

### Boot sequence

Suggested copy progression:

- Initializing WHO Core…
- Syncing caller intelligence…
- Loading protection layers…
- Checking communication engine…
- Relay subsystem ready…
- Identity engine ready…
- WHO ONLINE

Then:

**WHO**

**[ TAP TO IDENTIFY ]**

The prompt is much more on-brand than a generic "Start App."

### Important improvement

The boot should not make every user stare at a long loading screen on every visit.

Use:

- first visit = cinematic boot
- returning visit = very short boot
- optional "skip intro"
- touch + mouse + keyboard
- prefers-reduced-motion support
- save a local "intro seen" flag
- data-saver / low-power fallback

---

## 26. Recommended new landing architecture

### Scene 0 — Boot

Full-screen cinematic launch.

Black/near-black environment, scanlines or restrained particles, audio optional.

WHO logo appears as an object in the environment instead of a normal centered website logo.

### Scene 1 — Identify

Do not start with a normal navbar + text block.

Start with the question:

**WHO IS CALLING?**

A giant 3D phone floats in space.

An incoming-call UI appears.

Unknown number.

WHO analyzes it.

Then the result resolves into:

- possible identity
- confidence
- reputation
- action options

This instantly demonstrates the product instead of explaining it.

### Scene 2 — The phone becomes the website

As the user scrolls, the phone becomes the main stage.

The browser feels like a giant device laboratory around one product.

This is the biggest conceptual difference from the old website.

### Scene 3 — Feature "missions", not cards

Instead of:

> Feature / description / button / card

Use situations.

#### MISSION 01 — UNKNOWN CALL

Unknown call arrives.

Spam / reputation UI collides with the phone.

WHO shield intercepts it.

#### MISSION 02 — MESSAGE FLOOD

Messages pour into the screen.

WHO automatically sorts:

- Personal
- Transactions
- Spam
- Unknown

#### MISSION 03 — RELAY

Second phone enters.

A connection beam forms between them.

Host → Relay → Receiver

#### MISSION 04 — NETWORK

The phone switches from open routing to a protected WHO network state.

#### MISSION 05 — BACKUP

A contact database becomes a protected backup package.

Google Drive appears as an external destination.

The user controls the export.

---

## 27. 3D strategy

### Preferred stack

**GSAP + ScrollTrigger**  
Use for the master cinematic timeline, scroll choreography, pinning, entrance/exit sequencing and micro-interactions.

**Three.js**  
Preferred over Spline for the core 3D phone because WHO will likely need custom camera, material and interaction control.

**Lottie**  
Use only for small 2D/vector moments where it is clearly lighter than WebGL.

### Do not make everything 3D

Use 3D for:

- hero phone
- main device transitions
- Relay connection scene
- big end-of-page phone fly-through

Use normal DOM/UI for:

- actual text
- legal copy
- download controls
- accessibility
- forms
- navigation
- SEO content

This keeps the page fast and usable.

---

## 28. Mobile strategy

The mobile site should feel intentionally designed, not like the desktop version squeezed down.

### Mobile

- Single-column experience
- Large thumb-safe interaction targets
- Touch drag for the phone
- Tap-to-inspect caller card
- Reduce continuous animation
- Use a simplified 3D model
- Static WebP/AVIF fallback for weaker devices
- Lower WebGL pixel ratio
- Stop heavy animation while sections are offscreen
- Avoid mandatory gyroscope access
- Never require motion sensors just to navigate

### PC

- High-resolution 3D phone
- Mouse parallax
- Scroll-based camera movement
- richer particles
- optional sound
- keyboard shortcuts
- hover interactions
- larger multi-layer scenes

---

## 29. The "live counter" needs to be real

Do **not** fake a giant number such as:

> Spam calls blocked today: 42,981,302

unless the backend actually measures this.

Better public metrics:

- calls analyzed
- reputation signals processed
- reports reviewed
- active WHO devices
- downloads
- Relay sessions
- uptime

Only expose metrics that are real, aggregated and safe to publish.

The current WHO Control dashboard already exposes operational metrics that could eventually feed a carefully selected public counter.

---

## 30. Testimonials should feel like field reports

The fighting-game character-card idea is visually fun, but for a security/caller-intelligence product I would make the same interaction feel more trustworthy.

Instead of:

> Character selected / 99/99

Use:

**FIELD REPORT 027**

User avatar  
Platform  
WHO version  
Rating  
Short review

Then animate the card like a mission report.

This keeps the game-language without making the product look unserious.

---

## 31. Grand finale

The final section should feel like a product launch.

Suggested sequence:

1. Phone rotates toward camera.
2. WHO identity UI becomes full-screen.
3. Phone passes through the camera.
4. Screen becomes white/black.
5. Final statement:

**STOP GUESSING.  
KNOW WHO IS CALLING.**

Then platform actions.

### Download methods

- Android
- Windows
- iOS / iPadOS when genuinely available
- optional "Send me the link" interaction

The SMS-download idea is good, but it requires a real backend workflow and anti-abuse protections.

---

## 32. New site information architecture

Suggested main navigation:

- **WHO**
- **Experience**
- **Protection**
- **Relay**
- **Network**
- **Download**

Secondary/legal:

- Safety
- Privacy
- Terms
- Support
- Developers
- Security

The visual UI should make the navigation feel like a product control layer, not a standard corporate navbar.

---

## 33. New design personality

The target should feel like:

- premium
- technical
- cinematic
- confident
- dangerous-looking in a controlled way
- futuristic
- trustworthy
- minimal when text is needed

Avoid:

- generic SaaS cards
- purple-heavy gradients
- endless glass cards
- fake statistics
- massive paragraphs above the fold
- overuse of "AI" buzzwords
- neon for its own sake
- game UI that makes the app itself look like a game

WHO should look like a **serious communications-security product with a cinematic launch experience**.

---

## 34. New build performance rules

The new website should have an explicit performance budget.

### Required

- lazy-load 3D scene assets
- preload only hero-critical assets
- compressed WebP/AVIF images
- Draco/KTX2 or equivalent optimization where useful for 3D
- no giant uncompressed textures
- pause offscreen animation
- cap WebGL pixel ratio
- support reduced motion
- detect WebGL failure
- static fallback for weak devices
- no blocking third-party libraries in the critical path
- route-level code splitting where appropriate

### Recommended

Use a real build system (for example Vite) so the final Pages artifact contains only optimized production assets.

---

## 35. New architecture recommendation

The rebuilt website should be treated as an actual application rather than a pile of static HTML files.

Suggested structure:

```
src/
  app/
  components/
  scenes/
  pages/
  data/
  styles/
  assets/

public/
  icons/
  seo/
  static-fallbacks/

dist/
```

Build output only:

`dist/`

GitHub Pages should publish only `dist/`.

---

## 36. New runtime boundaries

Keep these separate:

### Public website

- marketing
- product story
- downloads
- public metrics
- support
- legal
- public feedback

### Auth / account

- desktop pairing
- account sign-in
- account creation
- confirmation code
- OAuth
- short-lived sessions

### Admin

- operational metrics
- user management
- moderation
- releases
- remote config
- announcements
- crashes
- audit

### Backend

- secrets
- authentication
- database access
- privileged analytics
- caller-intelligence processing
- signing keys
- release metadata if centralized

The website should never become the security boundary for privileged operations.

---

## 37. Migration checklist

Before deleting the old site:

- Preserve this README archive.
- Preserve the public API origin.
- Preserve the companion `who-app` repository reference.
- Preserve desktop pairing endpoint contracts.
- Preserve Google public client ID.
- Preserve account-missing behavior.
- Preserve feedback submission workflow.
- Preserve admin endpoint map.
- Preserve remote-config fields.
- Preserve caller-intelligence principles.
- Preserve Relay + Ultra Relay behavior.
- Preserve WHO Network/VPN terminology.
- Preserve privacy/legal concepts.
- Preserve public download metadata.
- Preserve brand assets only if the new design actually needs them.
- Rebuild the sitemap from actual new routes.
- Replace the share image.
- Replace the favicon if desired.
- Decide whether `/admin/` remains here or moves to a dedicated origin.
- Decide whether `/device-login/` stays on the same host or moves to an auth-specific origin.
- Search Git history for credential leaks.
- Rotate anything that was ever exposed.
- Build to `dist/`.
- Deploy only `dist/`.

---

## 38. Final handoff summary

The old website is not worthless. It contains a lot of **product truth and backend contract information**, but its presentation has become too much like a conventional startup/product website.

Carry forward the **system**:

- WHO caller intelligence
- confidence-based identity
- privacy-first community signals
- Relay
- Ultra Relay
- VPN/network
- backup direction
- account/authentication
- desktop pairing
- feedback moderation
- remote config
- crash reporting
- audit
- website/download analytics

Do **not** carry forward the old visual structure:

- fixed corporate navbar
- hero + cards
- generic bento layout
- CSS-only phone mockup
- basic "Get WHO" landing flow
- fake progress bar
- manually maintained sitemap
- source-root-as-production deployment

The rebuild should feel like **launching WHO**, not visiting a product brochure.

---

# INTERNAL / REMOVE LATER

## Repository

`squashberry/who`

## Default branch

`main`

## Public Pages URL

`https://squashberry.github.io/who/`

## API origin

`https://who-api.who-fe3.workers.dev`

## Companion app repository

`https://github.com/squashberry/who-app`

## Public Android asset used by the old site

`https://raw.githubusercontent.com/squashberry/who-app/main/WHO-v1.0.0.apk`

## Public support email

`squashberrypro@gmail.com`

## Google OAuth public client ID

`207148022166-rn08uv7r...apps.googleusercontent.com`

> Full value exists in the current public `device-login/index.html`. It is a public OAuth client identifier and is not a secret.

## Sensitive credential checklist

- WHO admin password → backend secret store only
- Google OAuth client secret → Google Cloud/backend only
- Backend token/signing secret → backend secret store only
- Database passwords/service credentials → backend secret store only
- Supabase privileged key/service role → backend only
- OTP/mail provider secret → backend only
- Android signing keys → secure release environment only
- Any private encryption keys → secure key store only

**Do not replace the placeholders above with actual secret values in this public repository.**

## Current admin API map

- POST `/admin/login`
- GET `/admin/session`
- POST `/admin/logout`
- GET `/admin/config`
- PATCH `/admin/config`
- GET `/admin/stats`
- GET `/admin/download-stats?range=<days>`
- GET `/admin/website-stats?range=<days>`
- GET `/admin/crashes?limit=200`
- PATCH `/admin/crashes/<id>`
- GET `/admin/reports`
- PATCH `/admin/reports/<id>`
- GET `/admin/feedback`
- PATCH `/admin/feedback/<id>`
- GET `/admin/audit`

## Current public/auth API map

- POST `/auth/request-code`
- POST `/auth/verify-code`
- POST `/auth/google`
- GET `/desktop/pair/request/<pairingCode>`
- POST `/desktop/pair/request/<pairingCode>/authorize`
- POST `/feedback`
- POST `/analytics/collect`

## Historical security note

A historical commit named **"Restore WHO Control password login UI"** added the admin password entry form, but the current frontend uses the backend `/admin/login` endpoint and does not contain the actual admin password.

The Git repository is public. Assume anything ever committed should be treated as potentially public until verified and rotated.

