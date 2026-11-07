# RevisePro

A free-to-host revision workspace on GitHub Pages, with Supabase accounts and progress sync. Visitors see a public introduction; the study workspace requires sign-in. Learners select their own subjects at signup, or on their next sign-in if they already have an account. They can change these later, use introductory notes, quizzes and searchable flashcards, plan study sessions, and follow curated resource links.

The library has 105 starter sets with 2,100 original cards across all 67 listed subjects (20 cards per set), plus a custom-subject option. These are **introductory examples, not complete or exam-board-specific coverage**; custom subjects may not have ready-made cards. Learners can create sets for their subjects and choose whether they are private or public to signed-in users. The library shows up to 100 of a learner's latest sets and 100 recent public sets. Public sets are unmoderated user-generated content: do not put personal information in them, and check accuracy independently. The Video lessons section includes 34 selected third-party YouTube lessons, playable in the site with an accompanying flashcard suggestion, plus subject-specific YouTube searches (whose results are not reviewed). Thumbnails load from YouTube in the video library; choosing a lesson loads a privacy-enhanced YouTube player. YouTube and creators control playback, availability, adverts and data handling; an external YouTube link is provided if an embed is unavailable. Videos may not match every exam board.

## Supabase setup

1. Create a free Supabase project. Run [`supabase/setup.sql`](supabase/setup.sql) and [`supabase/flashcard_sets.sql`](supabase/flashcard_sets.sql) in its SQL Editor. The latter adds the flashcard table and row-level policies: authenticated users can read their own and public sets, but only their own sets can be changed or deleted. Anonymous users have no access. The progress table has separate per-user policies.
2. In **Authentication → URL Configuration**, set the Site URL to `https://reviselikeapro.github.io/public/` and add `https://reviselikeapro.github.io/public/login.html` to the Redirect URLs allowlist. Keep email confirmation enabled. When a confirmation link is opened, the browser returns to the login page rather than opening the workspace directly.
3. Set the Project URL and **publishable key** (or legacy `anon` key) in [`public/config.js`](public/config.js). These keys are intended for browser use only with row-level security enabled. Never publish a `service_role` or `sb_secret_` key, database password, SMTP credentials, or personal access token.
4. Configure a custom SMTP sender for public signups, then test signup, confirmation, sign-in, progress sync across two devices and private/public visibility with two accounts. The built-in Supabase email sender is intended for testing: it sends only to organisation team addresses and is limited to two emails per hour. A third-party SMTP service may offer a free tier but has separate limits, requirements and possible charges. See [Supabase's email testing guide](https://supabase.com/docs/guides/auth/testing-auth-flows). Email confirmation must remain enabled; do not bypass it to avoid configuring email.

For the existing project, the schemas and production confirmation redirect have already been configured, but **custom SMTP is still required for general public registration**. Existing guest data stays on its original device but is not automatically imported into an account and is no longer accessible in guest mode.

The free tier has limits, may pause after inactivity, and does not include automatic backups. Review [Supabase pricing](https://supabase.com/pricing), privacy and safeguarding requirements, email delivery, backup strategy, account recovery, moderation and security before inviting real users, particularly children. Simultaneous edits on different devices are last-write-wins. Failed syncs remain on the device and the account menu lets the learner explicitly choose local or cloud progress.

## Development

Requires Node.js 22.5 or newer. Run `npm ci`, then `npm start` and open http://localhost:3000. The bundled Node server serves the static site; the frontend account flow uses Supabase. For a local confirmation redirect, add the local `login.html` URL to the Supabase allowlist as well. The experimental Node/SQLite API remains available for development but is not used by the hosted Supabase account flow or GitHub Pages.

`npm test` runs unit, browser-DOM and local API tests. Account UI tests use mocks and do not prove live email delivery or a cross-device sync. `npm run build:client` rebuilds the checked-in browser Supabase bundle from pinned package dependencies. Its third-party licenses are in `public/licenses/`.

## Research

The product brings together ideas found across BBC Bitesize, Physics & Maths Tutor, Seneca, Cognito, Save My Exams, Quizlet, Anki, Get Revising, Maths Genie and Corbettmaths. The Resources page links to each; this project does not reproduce their proprietary content or claim their coverage.

## Video and learning design notes

The selected player loads only after a learner chooses a lesson; the gallery uses lazy-loaded YouTube thumbnails. Embedded playback uses YouTube's privacy-enhanced domain and a referrer policy that sends the site origin, as required by YouTube. Embedding may be blocked by a video's owner, privacy tools, or regional restrictions; no automatic playback or guarantee of availability is assumed. See [YouTube's embedding guidance](https://support.google.com/youtube/answer/171780) and [player requirements](https://developers.google.com/youtube/player_parameters). The short recall prompt and related flashcards are informed by the Education Endowment Foundation's guidance on [retrieval and revision routines](https://educationendowmentfoundation.org.uk/news/eef-guest-blog-building-study-habits-and-revision-routines); they are not a claim of guaranteed outcomes.
