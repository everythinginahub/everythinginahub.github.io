# RevisePro

A revision workspace with starter GCSE-level notes, quizzes, 32 searchable flashcard sets (148 original cards across eight subjects), a planner and curated resources. Guest progress is stored in the browser. Account login and sync use Supabase when configured; GitHub Pages serves the site for free. Starter topics are not a complete or exam-board-specific curriculum.

## Set up free accounts on GitHub Pages

The Supabase project must be created and configured by its owner. The code is ready, but the site remains in guest mode until all these steps are complete.

1. Create an account at [Supabase](https://supabase.com/) and create a **Free** project. Choose a region and set a strong database password; keep that password private. Wait for provisioning.
2. In Supabase open **SQL Editor**, create a new query, and paste and run the entire [`supabase/setup.sql`](supabase/setup.sql) file. This creates the progress table and row-level policies so authenticated users can only access their own row. Do not skip the policies.
3. In **Authentication → URL Configuration**, set the Site URL to `https://reviselikeapro.github.io/public/`. Add the same URL to the Redirect URLs allowlist. Save.
4. Open the project's **Connect** dialog or project settings/API keys and find the **Project URL** and **publishable key** (or the legacy `anon` public key). These are intended for browser use, with RLS enabled. Never use the `service_role` or `sb_secret_` key, database password or any personal access token in the website or chat.
5. On GitHub, open [`public/config.js`](public/config.js), click the pencil to edit it, and fill in the Project URL and publishable key between the quotation marks. Leave the rest unchanged. Commit the change to the publishing branch (`main`). Wait for GitHub Pages to finish deploying, then open `https://reviselikeapro.github.io/public/` and refresh.
6. Create an account and test sign-in, adding a planner entry, signing out, and signing back in on another browser/device. Guest and account progress are separate. Existing guest progress is not automatically uploaded or deleted.

**Email limitation:** Supabase's built-in email sender is for testing: it sends only to addresses on your Supabase organisation's team and is limited to 2 messages per hour. Public email signups with confirmations require a custom SMTP provider; its availability and pricing are separate. Do not disable email confirmation without understanding that anyone could claim another person's email address. See [Supabase's email testing guide](https://supabase.com/docs/guides/auth/testing-auth-flows).

The free tier has limits, can pause after inactivity, and does not include automatic backups. Review [Supabase pricing](https://supabase.com/pricing), privacy and safeguarding requirements, email delivery, backup strategy, account recovery and security before allowing real users, particularly children. Simultaneous edits on different devices are last-write-wins. Failed syncs remain on the device and the account menu lets the learner explicitly choose local or cloud progress.

## Development

Requires Node.js 22.5 or newer. Run `npm install`, then `npm start` and open http://localhost:3000. The bundled Node server serves the static site; the frontend account flow uses Supabase when configured. The earlier experimental Node/SQLite API remains available for development but is not used by the website's Supabase account flow and is not hosted by GitHub Pages.

`npm test` runs unit, browser-DOM and local API tests. `npm run build:client` rebuilds the checked-in browser Supabase bundle from pinned package dependencies. Its third-party licenses are in `public/licenses/`. Without a real configured Supabase project, the hosted account flow can only be tested with mocks.

## Research

The product brings together ideas found across BBC Bitesize, Physics & Maths Tutor, Seneca, Cognito, Save My Exams, Quizlet, Anki, Get Revising, Maths Genie and Corbettmaths. The Resources page links to each; this project does not reproduce their proprietary content or claim their coverage.
