# Decision Log

Every design decision made while building this project, in a reusable form:
what was decided, what else was considered, and why. Entries are numbered in
the order they were made. A decision is only recorded here once the project
owner has confirmed it, except where marked otherwise.

Each entry has: **Decision**, **Alternatives**, **Why**, and a date. A
decision that replaces an earlier one says so.

## Version 1: the counter server

### 1. Credentials go in the JSON request body (2026-11-21)

- **Decision:** Callers send `{ "user", "password" }` in the body of the
  request.
- **Alternatives:** An `Authorization` header (the usual real-world choice).
- **Why:** The brief says Zod validates the body, and the body keeps the
  example simple, with one place to look for everything the request carries. A
  real API would use a header. Mention that in class.

### 2. The route is `POST /count` (2026-11-21)

- **Decision:** One route, `POST /count`.
- **Alternatives:** `GET /count`.
- **Why:** Calling it changes state (it counts), so POST is the correct verb,
  and a body cannot reasonably be sent with GET.

### 3. Failed attempts are not counted (2026-11-21)

- **Decision:** Only authorized calls increment the counter.
- **Alternatives:** Count every call.
- **Why:** The brief says the count is of calls "by an authorized user".
  Invalid and unauthorized requests never reach the Counter.

### 4. Keep the existing ESLint and Prettier setup (2026-11-21)

- **Decision:** Keep the project's ESLint and Prettier configuration.
- **Alternatives:** Remove them to make the example smaller.
- **Why:** They are useful for students, and they were already there.

### 5. Keep the `keyv` dependency (2026-11-21)

- **Decision:** Keep `keyv` although version 1 does not use it.
- **Alternatives:** Remove it until needed.
- **Why:** It is needed for the next increment (Extension #1).

### 6. Factory functions with injected dependencies (2026-11-21)

- **Decision:** `createApp(auth, counter)`, `createCounter()`, `createAuth()`;
  `server.ts` wires them together. No module-level globals.
- **Alternatives:** Module-level singletons; classes; a dependency-injection
  framework.
- **Why:** Tests get fresh instances and stubs, students can see the
  dependencies, and the Controller depends only on interfaces. No framework
  keeps it tiny.

### 7. Imports name the real file, `.ts` (2026-11-21)

- **Decision:** `import ... from "../src/auth.ts"`, enabled by
  `allowImportingTsExtensions` in tsconfig.
- **Alternatives:** `.js` extensions (the NodeNext convention); extensionless
  imports with `moduleResolution: "Bundler"`.
- **Why:** Students see the actual file name. A `.js` import of a `.ts` file
  is confusing to explain.

### 8. The error handler stays a typed `const` (2026-11-22)

- **Decision:** `const badJson: ErrorRequestHandler = ...; app.use(badJson)`.
- **Alternatives:** Inline the function in `app.use(...)`.
- **Why:** Inlining was tried and failed typechecking: Express cannot infer
  the four parameters of an inline error handler. Annotating all four inline
  was longer than the named constant.

### 9. Local git repository and first commit (2026-11-22)

- **Decision:** `git init` on branch `main`; first commit `38d5d07`.
- **Alternatives:** None considered.
- **Why:** Needed a commit point before continuing.

### 10. Show the server with curl first; keep Supertest tests (2026-11-22)

- **Decision:** `demo.sh` (curl) is shown first; the Supertest tests with
  `await` stay as the automated version, with a comment explaining `await`.
- **Alternatives:** Postman; a VS Code `.http` file; Supertest only.
- **Why:** Students may not know `async`/`await`. A curl demo shows real I/O
  and motivates it. Postman adds a tool outside the stack and an opaque JSON
  file; curl needs nothing extra. None of these can replace the automated
  tests that Stryker needs.

### 11. `.gitattributes` keeps shell scripts on LF (2026-11-22)

- **Decision:** `*.sh text eol=lf`.
- **Alternatives:** Leave line endings to git's defaults.
- **Why:** On Windows, CRLF line endings break a bash script's shebang line.

### 12. The npm script is `mutations`, not `mutate` (2026-11-23)

- **Decision:** `npm run mutations`. Stryker's own `mutate` config key is
  unchanged.
- **Alternatives:** Keep `mutate`.
- **Why:** Owner's preference for the name.

### 13. `vitest.config.mjs` (2026-11-23)

- **Decision:** Rename `vitest.config.ts` to `vitest.config.mjs`.
- **Alternatives:** Keep `.ts`, add it to tsconfig, and allow `*.config.ts` in
  the ESLint dev-dependency rule.
- **Why:** The project's ESLint rule already allows dev-dependency imports in
  `*.config.mjs`, so this is the smallest change. Cost: the config file is not
  type-checked, which matters little for five lines.

### 14. The authorized user is `alice` / `secret` (2026-11-23)

- **Decision:** One hardcoded user/password pair for version 1.
- **Alternatives:** Other credentials.
- **Why:** The brief asks for a single, very simple pair. **Superseded for the
  new endpoints by decisions 23 and 25;** the counter app keeps this pair
  unchanged (see 33).

### 15. Error reply bodies (2026-11-23)

- **Decision:** `{ "error": "Invalid request" }` (400) and
  `{ "error": "Unauthorized" }` (401).
- **Alternatives:** More detailed messages.
- **Why:** Short and uniform; detail is not needed for the example.

### 16. Empty `user` or `password` is malformed (2026-11-23)

- **Decision:** Empty strings fail validation (400), not authentication (401).
- **Alternatives:** Treat them as wrong credentials.
- **Why:** An empty field is a problem with the request's form, which is the
  Controller's validation job, before Auth is ever asked.

### 17. Published as a public GitHub repository (2026-11-24)

- **Decision:** `neu-se/m02-architecture-examples-spring-2027`, public, remote
  `origin`, branch `main`.
- **Alternatives:** Private; a different name
  (`m02-counter-server-spring-2027`, `tiny-counter-server`).
- **Why:** The name follows the organization's `mNN-topic-examples-term`
  pattern. Public so students can read it. The demo credentials are visible,
  which is acceptable for a teaching example.

## Extension #1: recreation-center enrollment

Decisions 18 to 32 come from the review in
[EXTENSION-1-PLAN.md](enrollment-server/EXTENSION-1-PLAN.md) (items A1 to A12
and the gaps), confirmed 2026-11-24.

### 18. `POST /count` stays, unchanged (review item A1) — superseded by 33

- **Decision:** Both features live in one server. The counter endpoint, its
  tests and its curl demo keep working.
- **Alternatives:** Remove it so the server is only the enrollment app.
- **Why:** Keeps the version 1 example and its mutation-tested modules intact,
  and shows a second feature added to a working design.
- **Superseded (2026-11-24):** the owner wants the counter app visible to
  students without the extension's complications. Decision 33 keeps the goal
  (the counter stays intact) but separates the apps instead of combining them.

### 19. Persistent store: file-backed Keyv, memory in tests (A2)

- **Decision:** The repository uses Keyv with a file-backed adapter so data
  survives a restart. Tests use Keyv's in-memory store.
- **Alternatives:** In-memory Keyv only.
- **Why:** The extension asks for a _persistent_ repository, and Keyv's
  default store is in memory. The adapter (SQLite or a readable JSON-file
  adapter) is to be chosen in step 2 after checking that it installs cleanly
  on Windows.

### 20. Identity: login name, and an admin-supplied activity name (A3)

- **Decision:** A student's id is their login name; an activity's id is a
  unique name given by the admin. Duplicates get 409. No other attributes.
- **Alternatives:** Server-generated ids.
- **Why:** Simplest thing that works (YAGNI). Generated ids would add id
  generation and still need a uniqueness rule.

### 21. Only the student acts, for themself (A4)

- **Decision:** Sign-up and drop are done by the authenticated student for
  themself. The request does not repeat a student id. Admin cannot enroll or
  drop anyone.
- **Alternatives:** Requests name a student; admin may act on their behalf.
- **Why:** The scenario does not ask for it (YAGNI), and it removes a whole
  class of authorization rules and tests.

### 22. Edge cases fail distinctly (A5, A6)

- **Decision:** Only active enrollments count toward the limit of 3. A dropped
  activity frees a slot but stays blocked for that student. Already enrolled,
  a fourth active sign-up, re-signup after a drop, and dropping when not
  enrolled each fail (409) with a distinct message.
- **Alternatives:** Make repeats idempotent (return success).
- **Why:** Nothing is silently ignored, so each rule is visible in tests and
  in curl output.

### 23. Admin password from an environment variable; `admin` is reserved (A7)

- **Decision:** The `ADMIN_PASSWORD` environment variable, with a clearly
  labeled demo default. Creating a student named `admin` is rejected (400).
- **Alternatives:** A hardcoded admin password like `alice` / `secret`.
- **Why:** A hardcoded admin password in a public repository is a weak example
  to teach from. The README states the demo default is for demos only.

### 24. `authenticate()` returns an identity (A8)

- **Decision:** `authenticate(creds): Promise<{ name, isAdmin } | undefined>`.
  This applies to the enrollment app only. The counter app keeps its simple
  `isAuthorized()` (see 33).
- **Alternatives:** Keep `isAuthorized()` and add a second method.
- **Why:** Auth now reads stored students (async) and callers need to know who
  and whether admin, not just yes or no. One method is clearer than two
  overlapping ones. It is a deliberate interface change to teach from.

### 25. Passwords are hashed with `crypto.scrypt` (A9)

- **Decision:** Hash with Node's built-in `scrypt` and compare with
  `timingSafeEqual`, hidden behind Auth.
- **Alternatives:** Store plaintext.
- **Why:** Users now choose and store passwords, so plaintext is a real
  problem. The built-in needs no new dependency, and hiding it behind Auth is
  itself an information-hiding example.

### 26. The admin-only check lives in the Controller (A10)

- **Decision:** The Controller authenticates, checks `isAdmin` for
  create-activity, and replies 403. The Service holds only enrollment rules.
- **Alternatives:** Pass the identity to the Service and enforce it there.
- **Why:** Matches the original organization (the Controller calls Auth), and
  keeps authorization out of the business rules.

### 27. Four endpoints, all `POST`, credentials in the body (A11)

- **Decision:** `POST /students`, `POST /activities`,
  `POST /activities/:name/signups`, `POST /activities/:name/drops`.
- **Alternatives:** REST-style `DELETE` for drop.
- **Why:** Consistent with decision 1. Some clients drop the body of a
  `DELETE`, which would force credentials into a header.

### 28. The sign-up race is documented, not prevented (A12)

- **Decision:** Two simultaneous sign-ups can both pass the limit check, and
  two creates can both pass the duplicate check. A known-limitation comment
  and a README note say so.
- **Alternatives:** Serialize updates per student.
- **Why:** Locking is machinery that distracts from the teaching goals
  (YAGNI), and the race is a useful class discussion.

### 29. What is deliberately left out: the YAGNI ledger (gaps)

- **Decision:** No read endpoints, no semester entity, no capacities,
  schedules, deletion, password reset or pagination. Input rules are non-empty
  strings only. The README lists these as a "YAGNI ledger". Tests inspect the
  repository directly.
- **Alternatives:** Add read endpoints so curl can show state.
- **Why:** The scenario asks for four endpoints. Students see what was
  deliberately not built.

### 30. This log is `DECISIONS.md`, with rationale (step 0)

- **Decision:** One entry per decision with alternatives and why. DESIGN.md
  links here instead of holding a table.
- **Alternatives:** Keep the status table in DESIGN.md.
- **Why:** CLAUDE.md asks for decisions "in a reusable form", and a table of
  decision and status loses the reasoning.

### 31. CLAUDE.md edited (step 0)

- **Decision:** Fix the typo on line 8, and describe the extension in the
  Organization section. (The description was reworded under decision 33 to say
  the apps are separate projects, not one combined server.)
- **Alternatives:** Fix only the typo; leave it alone.
- **Why:** The document is the project's source of truth and had fallen
  behind.

### 32. Satisfaction condition: each new module fits on one screen (step 0)

- **Decision:** Added to CLAUDE.md for the extension.
- **Alternatives:** No explicit size condition.
- **Why:** Keeps "easy for students to understand" measurable. Split a file by
  resource only if it outgrows one screen.

## Repository layout

### 33. Two independent apps instead of one combined server (2026-11-24; supersedes 18)

- **Decision:** The counter app lives in `counter-server/`, unchanged. The
  extension lives in `enrollment-server/`, a separate project that starts from
  the counter's project setup (tooling and skeleton). The enrollment app has
  no Counter module and no `POST /count`.
- **Alternatives:** One combined server on `main` with a `v1-counter` tag for
  the old version; feature folders (`src/counter/`, `src/enrollment/`) in one
  app.
- **Why:** The owner wants the counter app visible to students without the
  extension's complications. In a combined server, the Auth interface change
  (decision 24) would force edits to the counter's Controller and tests, and
  the Controller, `keyv` and password hashing would clutter the small example.
  The repository name says "examples", plural, so a folder per example fits.
  Cost: some duplicated code and tooling.

### 34. Independent projects, no npm workspaces (2026-11-24)

- **Decision:** Each folder has its own `package.json`, tooling and
  `node_modules`. There is no root `package.json`, and students run every
  `npm` command inside a folder. Shared documents (`README.md`,
  `DECISIONS.md`, `CLAUDE.md`) are at the root. The commit before the move is
  tagged `v1-counter`. A `.vscode/settings.json` sets
  `eslint.workingDirectories` to `auto` so the ESLint extension finds each
  folder's config.
- **Alternatives:** npm workspaces with shared root tooling; one
  `package.json` at the root with two source folders.
- **Why:** Students are unlikely to know workspaces, and "a project is a
  folder with a `package.json`" needs no explanation. Cost: tooling files
  (such as the ESLint config) are copied into each folder, so a rule change is
  made twice.

### 35. The enrollment app starts as a minimal skeleton (2026-11-24)

- **Decision:** `enrollment-server/` begins with the counter's tooling files
  copied unchanged (package.json renamed, `keyv` kept) and a Controller whose
  `createApp()` takes no arguments and only sets up `express.json()` and the
  malformed-JSON error reply. A small `server.ts` starts it. Auth, Service and
  Repository parameters are added to `createApp` as those modules are written.
  The one test checks the 400 reply for malformed JSON.
- **Alternatives:** Declare empty `Auth`, `Service` and `Repository`
  interfaces up front; copy the counter's Controller and then delete the
  counter parts.
- **Why:** YAGNI. Interfaces declared before anything uses them would be
  guesses that later steps might change, and this way every line has a test.
  Cost: `createApp`'s signature changes in later steps.

### 36. The Service reports results, with a fixed order of checks (2026-11-24)

- **Decision:** Each Service method returns `{ ok: true }` or
  `{ ok: false, reason }`, where `reason` is a string from a short list per
  method, and never throws for a rule violation. Sign-up checks, in order: no
  such student, no such activity, already enrolled, previously dropped, limit
  of 3. Drop checks: no such student, no such activity, not enrolled.
- **Alternatives:** Throw typed errors; return `boolean`; check the limit
  before the "previously dropped" rule.
- **Why:** Results are easy to read and to test, and TypeScript makes the
  Controller handle every reason. "Previously dropped" is checked before the
  limit so a student at the limit who retries a dropped activity is told the
  real, permanent reason, not a temporary one. `no-such-student` is included
  because the type system requires handling a missing student, even though an
  authenticated student always exists.

### 37. The Repository interface is defined with the Service (2026-11-24)

- **Decision:** `src/repository.ts` holds the `Repository` interface and the
  `Student` and `Activity` types, written in step 2 because the Service needs
  them. A student's `enrollments` is
  `Partial<Record<string, "active" | "dropped">>`. Tests use a fake repository
  in `test/fakeRepository.ts` that copies records in and out. The Keyv
  implementation and shared contract tests come in step 3.
- **Alternatives:** Define the interface in step 3 and let the Service test
  use Keyv's memory store directly.
- **Why:** The Service cannot be written without it, and a fake keeps the
  Service tests about rules only. The `Partial` type is honest: an activity
  the student never joined has no entry, and a plain `Record` made the
  compiler treat the "dropped" check as always true.

### 38. The Service receives an already-hashed password, and owns the reserved name (2026-11-24)

- **Decision:** `createStudent(name, passwordHash)` stores the hash it is
  given; it does not hash. The reserved name `admin` is a constant and rule in
  `service.ts`, reported as the reason `reserved`.
- **Alternatives:** Pass the plain password and hash it inside the Service;
  keep the reserved-name check in the Controller.
- **Why:** Hashing is hidden behind Auth (decision 25), so the Service stays
  free of it. A reserved name is a rule about which students may exist, so it
  belongs with the other rules. **Resolved by decision 41:**
  `Auth.hashPassword()` produces the hash, and the shared admin name lives in
  `src/admin.ts`.

### 39. File-backed store: `keyv-file`, writing JSON (2026-11-24)

- **Decision:** The persistent repository uses Keyv with the `keyv-file`
  adapter, configured to write JSON (`serialize` and `deserialize` set to
  JSON) with `writeDelay: 0`. This settles the open adapter choice in
  decision 19.
- **Alternatives:** `@keyv/sqlite`; Keyv's default in-memory store only; a
  hand-written file adapter.
- **Why:** Checked on npm and by experiment on 2026-11-24. `@keyv/sqlite`
  6.1.0 needs Keyv 6 (we use 5.x) and the native `better-sqlite3` module,
  which means a major upgrade and possible Windows build trouble. `keyv-file`
  5.3.5 is pure JavaScript and targets Keyv 5. Its default format is binary
  (msgpack), so we switch it to JSON, which students can open and read. By
  default it waits 100 ms before each write; with `writeDelay: 0`, an awaited
  `set()` returns only once the data is on disk. A test in a second process
  confirmed data written just before an immediate exit was readable afterward.
  Cost: a community adapter rather than one maintained by the Keyv project.

### 40. Two factories, and contract tests that also check the fake (2026-11-24)

- **Decision:** `repository.ts` exports `createMemoryRepository()` and
  `createFileRepository(file)`, both built on one private helper over Keyv.
  Keyv appears nowhere outside this module. One set of contract tests runs
  against the fake used in Service tests, the in-memory repository and the
  file-backed repository, plus tests that data survives opening a new
  repository on the same file.
- **Alternatives:** One `createRepository(file?)` that picks memory or file;
  accept a Keyv instance as a parameter.
- **Why:** A single function with an optional path had a mutant Stryker could
  not kill (replacing the file check with `false`): without a filename the
  file adapter acts like memory, so the two modes were not distinguishable.
  Two functions have no such branch and read more simply. Passing a Keyv
  instance would leak Keyv to callers. Running the contract against the fake
  checks that the test double behaves like the real repository.

### 41. Auth has `hashPassword()` as well as `authenticate()` (2026-11-24; owner chose)

- **Decision:** `Auth` has two methods: `authenticate(credentials)`, which
  resolves to `{ name, isAdmin }` or `undefined`, and
  `hashPassword(password)`, which the Controller calls before passing the hash
  to `service.createStudent`. `createAuth(repository, adminPassword)` takes
  the repository (to look students up) and the admin password.
- **Alternatives:** A separate passwords module with `hash` and `verify`; the
  Service hashes.
- **Why:** All password handling stays hidden inside Auth (decision 25) and
  the Service stays free of it (decision 38). A separate module would add a
  fourth module for students to learn. Cost: the Controller coordinates two
  modules when creating a student.

### 42. How Auth checks passwords (2026-11-24)

- **Decision:** Each password is hashed with Node's `crypto.scrypt`, a random
  16-byte salt and a 64-byte key, stored as `salt:key` in hex, and checked
  with `timingSafeEqual`. The admin password is hashed once when Auth is
  created and checked the same way. For the login name `admin`, only that
  password counts; a stored student record named `admin` is ignored. The name
  is a constant in `src/admin.ts`, imported by both Auth and the Service.
  `promisify(scrypt)` is given an explicit type.
- **Alternatives:** Compare the admin password as plain text; keep the
  `ADMIN_NAME` constant in the Service or Auth; wrap the scrypt callback in a
  hand-written Promise.
- **Why:** One check path for everyone keeps Auth small, and a test covers the
  stored-`admin` case. A shared one-line file avoids Auth and Service
  importing each other. The hand-written Promise wrapper had an error branch
  no test can reach (a mutant survived), while the typed `promisify` has no
  branch. Known limit: an unknown user is rejected faster than a wrong
  password, which could reveal which names exist; not worth fixing in a
  teaching example.

### 43. In a module file, the public part comes first and private helpers last (2026-11-25)

- **Decision:** Each module file starts with its header comment, imports and
  public types, then the exported function (such as `createAuth`), and puts
  private helper functions and constants at the end, under a divider comment.
  First applied to `src/auth.ts`, and later to `src/controller.ts`, where
  the reason-to-status table and `reply` now follow `createApp`.
- **Alternatives:** Helpers first, as I originally wrote it (the order that
  suits languages that must define before use).
- **Why:** Someone reading the file to learn what the module does should meet
  the interface and the main function first, and see the hashing details only
  if they scroll on. `createAuth` then fits on one slide by itself. This works
  in TypeScript because the helpers are used only when the functions run, not
  while the file loads, and lint and typecheck accept it.

### 44. The HTTP contract of the four endpoints (2026-11-25)

- **Decision:** All four are `POST` with credentials in the body (decision 1).
  `POST /students` takes `{ user, password }`, which are the _new_ student's
  login and password (no existing login is needed). `POST /activities` takes
  `{ user, password, name }` from the admin. `POST /activities/:name/signups`
  and `/drops` take `{ user, password }`, and the student is whoever those
  credentials identify. Success is `201` (created) or `200` with
  `{ "ok": true }`. Failure is `{ "error": "<reason>" }`: `400 Invalid
request` (malformed), `401 Unauthorized`, `403 Forbidden` (not admin),
  and for Service reasons: `reserved` 400; `no-such-student` and
  `no-such-activity` 404; `duplicate`, `already-enrolled`,
  `previously-dropped`, `limit` and `not-enrolled` 409. The order of checks
  is: malformed, then unauthorized, then forbidden, then the Service.
- **Alternatives:** A separate `name` field for a new student; replying with
  the created record; `DELETE` for drops (see decision 29).
- **Why:** The login name _is_ the student's identity (decision 20), so a
  second field would only invite mismatches. Putting the Service's reason text
  in the error body makes the rules visible in curl output. One lookup table
  from reason to status keeps the mapping in one place. An admin who tries to
  sign up gets `no-such-student` (404), since admin is not a student; no
  special case is needed (YAGNI).

### 45. Zod throws, and the error handler answers only for bad requests (2026-11-25)

- **Decision:** Handlers call `Schema.parse(req.body)`, which throws a
  `ZodError` on a malformed body. Express 5 passes errors from async
  handlers to the error handler, which replies `400 Invalid request` for a
  `ZodError` or a `SyntaxError` (malformed JSON) and passes every other error
  on to Express's default handler (`500`). This replaces the `safeParse` plus
  `if (!success)` block that the counter's Controller uses.
- **Alternatives:** Repeat the `safeParse` check in each of the four handlers;
  keep the counter's catch-everything 400 handler.
- **Why:** The repeated check was four copies of the same two lines. Worse,
  with the catch-everything handler, deleting a check changed nothing visible
  (the resulting crash was also reported as 400), so mutation testing could
  not prove the check was tested. Replying 400 to a bug in our own code would
  also be misleading. A test makes the Service fail and expects 500. The
  counter app is unchanged (decision 33).

### 46. `server.ts` is wired at step 5, not step 6 (2026-11-25)

- **Decision:** Once `createApp` needed Auth and Service, `server.ts` was
  wired right away: a file repository at `DATA_FILE` (default
  `enrollment-data.json`), and the admin password from `ADMIN_PASSWORD`, with a
  demo-only default because the repository is public. Step 6 now holds only
  the end-to-end tests.
- **Alternatives:** Leave `server.ts` broken until step 6; wire it to the
  memory repository meanwhile.
- **Why:** Every commit should typecheck. A temporary wiring would be thrown
  away.

### 47. The demo script, and keeping the data file out of the checks (2026-11-27)

- **Decision:** `enrollment-server/demo.sh` tells the whole story with curl
  and shows every failure. It runs against an empty data file (the README says
  to delete `enrollment-data.json` first). Persistence is shown in a second
  run, `./demo.sh restart`, after the student stops and restarts the server.
  `enrollment-data.json` is listed in the root `.gitignore` and in a new
  `enrollment-server/.prettierignore`.
- **Alternatives:** Let the script start and stop the server itself; use a
  fresh data file for every run (a `mktemp` path); leave the data file
  unignored.
- **Why:** Students should see the server start and stop with their own eyes,
  as in decision 10, so the restart is a manual step. A script that starts
  servers hides the very thing being shown. Reusing the default file keeps the
  commands short. Prettier does not read the `.gitignore` of a parent folder,
  so without its own ignore file a student who ran the demo and then
  `npm run prettier` would see a warning about the data file.

### 48. Supabase version lives on a branch, `with-supabase` (2026-11-27)

- **Decision:** The Supabase version of the enrollment server will be built on
  a git branch named `with-supabase`, created from the finished Keyv-based
  `main`. `main` stays Keyv-only and is never touched by it. Nothing of the
  Supabase plan has been built yet; the other questions in
  `enrollment-server/SUPABASE-PLAN.md` (section 5) are still open.
- **Alternatives:** Both stores in `main` chosen by an environment variable; a
  second folder, `enrollment-server-supabase/`; a separate repository.
- **Why:** The two versions are the same app with a different store, which is
  what a branch is for, and only about eight files differ (the Repository,
  `server.ts`, dependencies, tests and docs). The Keyv version stays free of
  Supabase's dependency and setup (decisions 33 and 35). A folder or a second
  repository would mean making each later fix twice (decision 34). The owner
  can show either version by switching the default branch or by pointing
  students at a branch, and switching back loses nothing. The branch starts
  after the Keyv plan is finished, so there is nothing to merge back.

### 49. The credentials schema is repeated in the two apps, not shared (2026-11-27; made, but may want to revisit)

- **Decision:** The Zod schema for `{ user, password }` is written once in
  each app: `RequestBody` in `counter-server` and `Credentials` in
  `enrollment-server`. They are identical in shape. Inside the enrollment app
  it is defined once and reused (`NewActivity` extends it). The `Credentials`
  type in `auth.ts` is kept separate from the Controller's schema.
- **Alternatives:** A shared module or package used by both apps; Auth exports
  the type and the Controller checks its schema against it; deriving the type
  from the schema with `z.infer`.
- **Why:** The apps are independent projects with no shared code (decisions 33
  and 34), so sharing would need a common folder or workspace. The repeated
  line is one line, and the counter is finished. Deriving Auth's type from the
  Controller's schema (or the reverse) would make one module depend on the
  other's internals, against information hiding. The compiler already catches
  drift in one direction: the Controller passes the parsed body to
  `auth.authenticate`, which stops compiling if a field is lost or retyped.
- **Revisit if:** a third app needs the same schema, the fields of a login
  change, or students find the repeated name confusing (the Zod `Credentials`
  and the type `Credentials` never meet, but share a name).

### 50. Interfaces for the counter's modules live together in `interfaces.ts` (2026-11-27)

- **Decision:** In `counter-server`, the `Auth` interface, the `Credentials`
  type it uses, and the `Counter` interface are defined in one file,
  `src/interfaces.ts`. `auth.ts` and `counter.ts` keep only their `create…`
  factories and import their interface from there. The Controller and the
  Controller's test import both types from `interfaces.ts`. Only
  `counter-server` changed; `enrollment-server` is untouched.
- **Alternatives:** Keep each interface in its module's file (the earlier
  layout); one interface file per module.
- **Why:** The interfaces are the contracts between modules, so students can
  read all of them in one short file without any implementation details.
  Callers depend on the contract file, not on a module that also holds
  private code, which makes the separation of concerns and information hiding
  easier to see. `Credentials` moved too because `Auth` depends on it. It
  also makes the slides easier to read: one short file shows all the
  contracts at once.
- **Revisit if:** the enrollment app gets the same treatment (its Auth,
  Service and Repository files each hold their interface), or the file grows
  past one screen.

### 51. Controller layout and names chosen for readable slides (2026-11-27)

- **Decision:** In `counter-server/src/controller.ts`:
  - `RequestBody.safeParse` is wrapped in a standalone function,
    `validatedCredentials(body)`, which returns the `Credentials` or
    `undefined`.
  - The file reads top to bottom as `createApp`, then the `RequestBody`
    schema, then `validatedCredentials`, then the `badJson` error handler
    (now a module-level constant instead of one inside `createApp`).
  - `createApp`'s parameters are named `authService` and `counterService`
    (the Controller test's stubs match). The `Auth` and `Counter` interface
    names, the factories and the file names are unchanged.
- **Alternatives:** Leave `safeParse` and `badJson` inline in `createApp`;
  keep the shorter names `auth` and `counter`.
- **Why:** These changes are made to increase the readability of the slides.
  The route handler is the part students should read first, so it is shown
  alone, with the public function first and the private helpers after it
  (decision 43). Calling `validatedCredentials` reads as a sentence, and
  `createApp(authService, counterService)` shows that the Controller depends
  on services, not on the factories. Together with decision 50, the shorter
  `createApp` fits on a slide.
- **Revisit if:** the slides change, or the same layout is applied to
  `enrollment-server`.

### 52. The same layout in `enrollment-server`, and `...Service` file names (2026-11-27)

- **Decision:** `enrollment-server` gets the same treatment as `counter-server`
  (decisions 50 and 51), for the same reason: to increase the readability of
  the slides.
  - `src/interfaces.ts` holds the `Auth` and `Service` interfaces, the
    `Repository` interface, and the types they use (`Credentials`,
    `Identity`, `Result`, `Student`, `Activity`, `EnrollmentStatus`). The
    implementation files keep only their `create…` functions and helpers.
  - Files renamed: `service.ts` to `activityService.ts`, `auth.ts` to
    `authService.ts`, `admin.ts` to `adminService.ts`. `repository.ts` keeps
    its name. The matching test files were renamed too
    (`activityService.test.ts`, `authService.test.ts`).
  - In `controller.ts`, `createApp(authService, activityService)`; the Zod
    schemas, the `badRequest` handler, `STATUS` and `reply` come after
    `createApp`, and the Controller test's stubs use the new names. There is no
    `validatedCredentials` here, because this Controller uses Zod's throwing
    `parse` (decision 45), not `safeParse`.
  - Interface names (`Auth`, `Service`, `Repository`), factory names
    (`createAuth`, `createService`) and the `ADMIN_NAME` constant are unchanged.
- **Alternatives:** Leave the enrollment app as it was; move only the `Auth`
  and `Service` interfaces and leave `Repository`'s in `repository.ts`.
- **Why:** The two apps should look alike on the slides. Putting the
  `Repository` interface and record types in `interfaces.ts` too means every
  contract is in one short file, and `repository.ts` is left with the Keyv
  code that students need not read. The `...Service` names say what each
  module is, and `activityService` names the one that enrolls students in
  activities.
- **Note:** Earlier entries still use the old file names (`service.ts`,
  `auth.ts`, `admin.ts`), which were right when they were written.
- **Revisit if:** the Supabase branch changes how the Repository is split
  from its interface, or the files no longer fit on one screen.

### 53. The enrollment Controller uses `safeParse` again (2026-11-27; replaces the parsing part of 45)

- **Decision:** The enrollment Controller validates with `safeParse`, through a
  small private function `validated(schema, body)` that returns the data or
  `undefined`. Each of the three places that read a body (`/students`,
  `/activities`, and the shared `studentRoute`) checks the result and replies
  `400 Invalid request` itself. The `badRequest` error handler now answers only
  for a `SyntaxError` (malformed JSON from `express.json`) and passes every
  other error on to Express (`500`). Decision 45's rule that a bug in our own
  code is a 500, not a 400, still holds.
- **Alternatives:** Keep `Schema.parse` and let the error handler turn a
  `ZodError` into a 400 (decision 45).
- **Why:** The owner prefers `safeParse`: the 400 path is visible in each
  handler, and the enrollment Controller then reads like the counter's, which
  helps on the slides. The cost is a repeated two-line check, but only in three
  places, because `studentRoute` is shared by sign-up and drop. Mutation
  testing still catches a missing check, because the 400 is now written in the
  handler and the error handler no longer hides it (Stryker 100%).
- **Revisit if:** more endpoints are added, so that the repeated check grows.
