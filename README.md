# RevisePro

A lightweight revision workspace with starter GCSE-level notes, knowledge checks, flashcards, a study planner, and a curated resource directory. Guest progress is stored in the browser. Starter topics are not a complete curriculum and are not exam-board-specific.

## Run locally

Requires Node.js 22.5 or newer (Node 22 may show an experimental SQLite warning).

```sh
npm start
```

Visit http://localhost:3000. Create an account to sync progress to the server. Passwords are salted and hashed with scrypt; sessions use random, HTTP-only cookies. Data is stored in `data/revision.sqlite` by default. Set `PORT` and `DATA_DIR` to change the port and data location.

## Hosting and limitations

GitHub Pages only hosts static files: the root page redirects to `public/`, where guest mode works, but account creation and cross-device sync will not work there. To enable accounts, deploy this Node server on a host with HTTPS and a persistent writable disk, and set `DATA_DIR` to that disk. Serve the frontend and API on the same origin. Back up the SQLite database and consider operational security, monitoring, abuse prevention, privacy and safeguarding policies, password reset, email verification, accessibility review, and legal requirements before inviting real users, especially children. This is a starter product, not a production-ready replacement for established revision platforms.

## Tests

Run `npm test` for the account and progress API smoke tests.

## Research

The product brings together ideas found across ten well-known revision resources: BBC Bitesize (accessible explainers), Physics & Maths Tutor (topic practice and papers), Seneca (short interactive recall), Cognito (subject learning), Save My Exams (exam-focused resources), Quizlet (flashcards), Anki (retrieval practice), Get Revising (planning), Maths Genie and Corbettmaths (topic-based maths practice). The Resources page links to each; this project does not reproduce their proprietary content or claim their coverage.
