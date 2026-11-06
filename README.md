# RevisePro

A lightweight revision workspace with starter GCSE-level notes, knowledge checks, flashcards, a study planner, and a curated resource directory. Guest progress is stored in the browser. Starter topics are not a complete curriculum and are not exam-board-specific.

## Run locally

Requires Node.js 22.5 or newer (Node 22 may show an experimental SQLite warning).

```sh
npm start
```

Visit http://localhost:3000. Create an account to sync progress to the server. Passwords are salted and hashed with scrypt; sessions use random, HTTP-only cookies. Data is stored in `data/revision.sqlite` by default. Set `PORT` and `DATA_DIR` to change the port and data location.

## Hosting and limitations

GitHub Pages only hosts static files: the root page redirects to `public/`, where guest mode works, but account creation and cross-device sync do not work there. The Node server provides both the website and its account API on the same origin.

`render.yaml` is a deployment blueprint for a single Render web service and a persistent disk. It configures automatic deploys from `main`, Node 22, a health check, and the durable SQLite data directory. **This file does not create or activate a service by itself.** A Render account with access to this repository is required to create the Blueprint, and the Starter service and disk incur charges. Once deployed, use the Render service URL for both the site and login; GitHub Pages will remain guest-only unless its traffic is separately directed to the hosted service.

The backend is a starter implementation, not a production-ready replacement for an established revision platform. Back up the SQLite database and address operational security, monitoring, abuse prevention, privacy and safeguarding policies, password reset, email verification, accessibility review, and legal requirements before inviting real users, especially children. Do not deploy the SQLite database on an ephemeral filesystem: account and progress data would disappear on restart or redeploy.

## Tests

Run `npm test` for the account and progress API smoke tests.

## Research

The product brings together ideas found across ten well-known revision resources: BBC Bitesize (accessible explainers), Physics & Maths Tutor (topic practice and papers), Seneca (short interactive recall), Cognito (subject learning), Save My Exams (exam-focused resources), Quizlet (flashcards), Anki (retrieval practice), Get Revising (planning), Maths Genie and Corbettmaths (topic-based maths practice). The Resources page links to each; this project does not reproduce their proprietary content or claim their coverage.
