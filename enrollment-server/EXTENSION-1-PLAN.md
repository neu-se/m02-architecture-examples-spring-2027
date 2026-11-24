# Extension #1: Recreation Center Enrollment — Critique and Workplan

Status: **step 0 done (2026-11-24).** Every proposed resolution in this
document (A1 to A12 and the gaps) was confirmed as written. They are recorded,
with alternatives and reasons, as decisions 18 to 32 in
[DECISIONS.md](../DECISIONS.md). The repository layout was revised the same
day (decisions 33 and 34): this app is separate from `counter-server/`. Next:
step 1, the scaffold.

## 1. Critique of the Extension #1 description in CLAUDE.md

### What is already good

- The three teaching goals (service layer, async persistent repository, YAGNI)
  are clear, and the scenario really does need all three.
- The two business rules are small but interact. Rule 1 (at most 3) and rule 2
  (no re-signup after a drop) together force real design questions, such as
  what a "dropped" record is, and that is the point of a service layer.
- The authority section is short and settles who may create what.

### Ambiguities that change the design (resolve before building)

| #   | Issue                                                                                                                                                                                                                        | Proposed resolution                                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | **Relationship to the counter app.** The text says "extension", but the scenario has nothing to do with counting. Does `POST /count` stay? The "Organization" section also now describes only v1.                            | **Revised by decision 33:** the counter stays unchanged in `counter-server/`, and the extension is a separate app in `enrollment-server/`. It has no `POST /count`.                                                                                        |
| A2  | **What "persistent" means.** Keyv's default store is an in-memory `Map`, so data is lost on restart. Decision #5 reserved `keyv` for this increment but did not say which store.                                             | Use Keyv with a file-backed adapter so data survives a restart (candidates: `@keyv/sqlite`, or a JSON-file adapter, which is readable to students). Tests use the in-memory store. Verify the adapter installs cleanly on Windows before committing to it. |
| A3  | **Identity of students and activities.** "Login name" is unique for students. Activities are only "created", with no attributes or uniqueness stated.                                                                        | Student id = login name. Activity id = a unique name supplied by the admin. Duplicates of either get 409. No other attributes (YAGNI).                                                                                                                     |
| A4  | **Who may sign up or drop?** Not said. "A student signs up" implies the student themself, but nothing rules out student A enrolling student B, or admin acting for students.                                                 | Only the authenticated student acts, and only for themself. The student is identified by their credentials, so the request does not repeat a student id. Admin cannot enroll anyone (YAGNI).                                                               |
| A5  | **Does "at most 3 activities" count dropped ones?** Presumably not, but the text does not say.                                                                                                                               | Count only active enrollments. Dropping frees a slot, but the dropped activity stays permanently blocked for that student (rule 2).                                                                                                                        |
| A6  | **Edge cases of sign-up and drop.** Signing up twice for the same activity; dropping something never joined; dropping twice; signing up after a drop; a 4th sign-up.                                                         | Each gets a distinct, documented failure (see the status table below). None is silently ignored, so the rules are visible in tests and curl output.                                                                                                        |
| A7  | **Admin's password and the 'admin' name.** Where does it come from, and can a student register under the name `admin`?                                                                                                       | Admin password comes from an environment variable (`ADMIN_PASSWORD`). The name `admin` is reserved: creating a student called `admin` is rejected. The repo is public, so the README must say the demo default is for demos only.                          |
| A8  | **Auth's interface is too small now.** Today `isAuthorized(creds): boolean` is synchronous. Now Auth must look up persisted students (async), and callers need to know _who_ and whether they are admin, not just yes or no. | Change it to `authenticate(creds): Promise<Identity \| undefined>`, with `Identity = { name, isAdmin }`. This is a deliberate, teachable interface change. It applies to the enrollment app only; the counter keeps `isAuthorized()` (decision 33).        |
| A9  | **Passwords are now user-chosen and stored.** Decision #14's plaintext `secret` was a toy. Storing strangers' plaintext passwords is a real problem, but hashing adds async code and a dependency.                           | Hash with Node's built-in `crypto.scrypt` (no new dependency) and compare with `timingSafeEqual`. Hiding this behind Auth's interface is itself a good information-hiding example.                                                                         |
| A10 | **Where does authorization (admin-only) live?** CLAUDE.md puts "calls Auth" in the Controller, but "only admin can create activities" is not a business rule about enrollment.                                               | Controller authenticates and checks `isAdmin` for the create-activity endpoint (403 otherwise). The service holds only the enrollment rules and receives an already-trusted student name.                                                                  |
| A11 | **Endpoint shapes, status codes and where credentials go.** None given. Decision #1 put credentials in the JSON body, which fits `POST` but is awkward for `DELETE` (some clients drop DELETE bodies).                       | Use `POST` for every action, with credentials in the body, consistent with decision #1 (see the endpoint table).                                                                                                                                           |
| A12 | **Concurrency.** An async repository without transactions allows a race: two simultaneous sign-ups can both read "2 active" and both succeed. Duplicate-name checks race the same way.                                       | Accept and document it for the example (a one-line "known limitation" comment and a README note). It is also a good discussion prompt. Do not add locking (YAGNI).                                                                                         |

### Gaps that are probably fine, but should be a conscious choice

- **No read endpoints** (list activities, show my enrollments). YAGNI says
  leave them out. The cost is that curl can only show success or failure, not
  state, and tests must inspect the repository directly. **Proposed:** leave
  them out.
- **No semester entity.** "One semester" is a good YAGNI example: do not model
  it. **Proposed:** no semester field anywhere.
- **No capacities, schedules, deletion, password reset, pagination, or roles
  other than admin.** **Proposed:** list these in a "YAGNI ledger" in the
  README so students see what was deliberately not built.
- **Input rules** (name length and characters, password length). **Proposed:**
  non-empty strings only, as for `POST /count`.

### Problems with the document itself

- CLAUDE.md line 8 says "divided into to task-oriented modules" (typo), and
  the app has had three modules since the start.
- "Tiny" and "easy for students to understand" (the v1 satisfaction
  conditions) now pull against the extension. **Proposed:** keep the v1
  conditions, and add one for the extension: each new module must be readable
  on one screen, as the v1 files are.
- The Interaction section says to record decisions "in a reusable form". Our
  decision log is a table with no rationale or alternatives. See step 0.

## 2. Proposed design

```
HTTP -> Controller --(authenticate)--> Auth ----+
            |                                   v
            +--(enrollment rules)--> Service -> Repository -> Keyv store
```

| Module     | Responsibility                                                  | Hides                                   |
| ---------- | --------------------------------------------------------------- | --------------------------------------- |
| Controller | HTTP, Zod validation, calls Auth, admin check, status mapping   | Express, status codes                   |
| Auth       | `authenticate(creds)` returns an `Identity` or nothing          | Password hashing, admin password source |
| Service    | The two business rules, plus create-student and create-activity | Rule logic, record layout rules         |
| Repository | Async get and save of students and activities                   | Keyv, the store, key naming             |

Notes:

- **The Service returns results, not exceptions**: a small discriminated union
  such as `{ ok: true } | { ok: false, reason: "duplicate" | "limit" | ... }`.
  The Controller maps reasons to status codes. This is easy to read and test.
- **Repository interface is domain-specific** (`getStudent`, `saveStudent`,
  `getActivity`, `saveActivity`), not a generic key-value API, so Keyv does
  not leak upward.
- **Record layout (proposed):** a student document holds
  `{ name, passwordHash, enrollments: { [activity]: "active" | "dropped" } }`.
  An activity document is `{ name }`. With no queries or joins in Keyv, one
  student document answers both the "at most 3" and "never again" questions
  with one read.
- **Dependencies are injected**, as in decision #6:
  `createApp(auth, service)`.

### Endpoints (proposed)

| Endpoint                         | Who         | Success | Failures                                                                              |
| -------------------------------- | ----------- | ------- | ------------------------------------------------------------------------------------- |
| `POST /students`                 | anyone      | 201     | 400 malformed or reserved name `admin`; 409 duplicate name                            |
| `POST /activities`               | admin only  | 201     | 400 malformed; 401 bad credentials; 403 not admin; 409 duplicate                      |
| `POST /activities/:name/signups` | the student | 200     | 400; 401; 404 no such activity; 409 already enrolled, 3 active, or previously dropped |
| `POST /activities/:name/drops`   | the student | 200     | 400; 401; 404 no such activity; 409 not currently enrolled                            |

Every body carries `{ user, password }`. `POST /students` and
`POST /activities` also carry the new name. Reply bodies are
`{ "error": "..." }` on failure, as in v1.

## 3. Workplan

Each step is test first, then code, then lint, typecheck and tests green, then
commit. Any decision made along the way is logged immediately.

0. **Settle decisions and the repository layout.** Done 2026-11-24: A1 to A12
   and the gaps confirmed (decisions 18 to 32); CLAUDE.md edited; the counter
   app moved to `counter-server/` and the layout settled (decisions 33 and
   34).
1. **Scaffold `enrollment-server/`.** Copy the counter's tooling (package.json
   with a new name, keeping `keyv`; ESLint, Prettier, tsconfig, Vitest and
   Stryker configs) and its `createApp` and error-handler pattern. Leave out
   the Counter module and `POST /count`. Verify `npm install`, lint and
   typecheck work from inside the folder.
2. **Domain and service with an in-memory fake repository.** Types, then
   service tests for: create student, duplicate; create activity, duplicate;
   sign up; fourth sign-up rejected; drop frees a slot; re-signup after drop
   rejected; sign up twice; drop when not enrolled. Then the service.
3. **Repository.** Define the async interface. Write one shared set of
   contract tests, run against the fake and against Keyv (memory store). Add
   the file-backed adapter and a test that data survives creating a new
   repository on the same file (a simulated restart).
4. **Auth.** Write `authenticate(): Promise<Identity | undefined>` with scrypt
   hashing and the reserved `admin` name, reading students through the
   repository. This is where the first `await` appears in `src/`, and a good
   place for a short comment.
5. **Controller.** Add the four endpoints with Zod schemas and the
   reason-to-status mapping, tested with stub Auth and Service as before.
6. **Wiring and end-to-end tests.** `server.ts` chooses the store file path
   and reads `ADMIN_PASSWORD`. End-to-end tests with real modules over the
   in-memory store cover the full story, including the drop and re-signup
   rule.
7. **Demo and docs.** A curl script (for example `demo.sh`) that walks the
   story, including the failures. README sections for the endpoints, the
   persistence setup, the admin password, the known race, and the YAGNI
   ledger. Update the root README's table.
8. **Mutation testing.** Run `npm run mutations`, kill survivors with tests,
   and report the score as before.
9. **Review and publish.** YAGNI pass (remove anything unused), readability
   check that each file fits on one screen, update the decision log, commit,
   and push.

### Done when

- All rules in the scenario are covered by service tests and visible in the
  curl demo.
- Data survives a server restart, shown in the demo.
- `counter-server/` is untouched: its tests, 100% mutation score and demo all
  still pass.
- Lint, typecheck and tests pass, and the mutation score is at least 90%.
- Each decision above is in the log with its rationale.

### Risks

- **Adapter install friction** on Windows (native modules). Check in step 2
  before building on it.
- **Duplicated tooling.** A rule change in one app's ESLint or Prettier config
  must be repeated in the other (decision 34).
- **Size creep.** The service and controller may exceed one screen. Split by
  resource only if needed (YAGNI until then).
