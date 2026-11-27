# Retargeting the enrollment server from Keyv to Supabase — Plan

Status: **on hold, nothing built.** The organization is decided: a branch
called `with-supabase` (question 1; decision 48 in
[DECISIONS.md](../DECISIONS.md)). The other open questions are in section 5.
Work on this plan waits until the Keyv plan (`EXTENSION-1-PLAN.md`) is
finished. Each later answer goes into DECISIONS.md with its alternatives and
reasons, as before.

## 1. Goal

Make a second version of the enrollment server whose Repository stores data in
Supabase (hosted Postgres) instead of Keyv, so that **you can choose which
version to show the students**, and switch between them at will. Nothing else
about the app changes: same endpoints, same rules, same tests of behavior.

This is the payoff of the Repository module. Its interface is already async
and speaks only of students and activities, so Service, Auth and Controller
should not change at all.

## 2. What changes (the footprint)

| File                         | Change                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/repository.ts`          | Replace the two Keyv factories with `createSupabaseRepository(client)`. Types and interface stay. |
| `src/server.ts`              | Create the Supabase client from `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`; drop `DATA_FILE`.      |
| `package.json`               | Remove `keyv` and `keyv-file`; add `@supabase/supabase-js`.                                       |
| `supabase/schema.sql` (new)  | The two tables, and row-level security switched on.                                               |
| `.env.example` (new)         | The variable names, with no values. `.env` goes in `.gitignore`.                                  |
| `test/repository.test.ts`    | The shared contract runs against the fake and Supabase. The memory and file runs go away.         |
| `test/enrollment.test.ts`    | End-to-end tests use the fake repository. The restart test becomes a Supabase-only test.          |
| `README.md`, `demo.sh`, docs | Persistence section, setup steps, and how to reset the demo data.                                 |

Unchanged: `activityService.ts`, `authService.ts`, `adminService.ts`,
`controller.ts`, `interfaces.ts`, and every Service, Auth and Controller test.
Showing students that `git diff main..with-supabase -- src` touches only
`repository.ts` and `server.ts` is itself a good demonstration of information
hiding.

## 3. How to organize the two versions

| Option                                                      | Switching                                       | Keeps each version clean                                                  | Drift and upkeep                                                                        |
| ----------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **A. A branch, `with-supabase`** (your idea)                | `git switch`, or change GitHub's default branch | **Yes.** `main` never sees Supabase.                                      | Low. Only ~8 files differ, so merging `main` into the branch rarely conflicts.          |
| B. Both stores in `main`, chosen by an environment variable | Change a variable                               | No. The Keyv version gains a Supabase dependency and setup it never uses. | None, but it breaks "uncluttered" and YAGNI (decisions 33 and 35).                      |
| C. A second folder, `enrollment-server-supabase/`           | Open the other folder                           | Yes                                                                       | High. Every fix is made twice (the cost already accepted for the tooling, decision 34). |
| D. A separate repository                                    | Open the other repository                       | Yes                                                                       | Highest, and two places for students to look.                                           |

**Recommendation: A, the branch.** The two versions are the _same app_ with a
different store, which is what a branch is for. The counter and the enrollment
app became folders (decision 33) because they are different apps. B is
attractive for teaching the swap, but the branch diff teaches the same lesson
without burdening the Keyv version.

How to run option A:

- **Branch from the finished `main`.** Finish steps 8 and 9 first, so the
  branch starts from the final code and there is nothing to merge back.
- **Keep the branch's commits few and confined** to the files in section 2.
- **Tag the stable point on `main`** (for example `v2-keyv`), as we did with
  `v1-counter`, so the Keyv version can always be recovered exactly.
- **Bring later fixes across** with `git merge main` while on `with-supabase`.
- **Choose what students see** by switching the repository's default branch on
  GitHub (Settings, then Branches), or by giving them
  `git clone -b with-supabase <url>`. Switching back is the same step the
  other way. `main` is never touched, so nothing can be lost.
- **To have both open at once**, use
  `git worktree add ../m02-supabase with-supabase`. This repository is inside
  OneDrive, so put the worktree outside OneDrive, or `node_modules` will sync.

## 4. Design of the Supabase repository

**Schema (proposed).** One table per record type, mirroring the current
records, so `saveStudent` stays a single atomic write:

```sql
create table students (
  name text primary key,
  password_hash text not null,
  enrollments jsonb not null default '{}'
);
create table activities (name text primary key);
alter table students enable row level security;
alter table activities enable row level security;
```

- **Alternative:** a third `enrollments (student, activity, status)` table. It
  is the textbook relational design and shows joins, but `saveStudent` would
  then write several rows, and the supabase-js client has no multi-statement
  transaction. The JSON column keeps one student to one row.
- **Mapping:** the Repository converts `password_hash` to `passwordHash` and
  back, so the columns' naming never leaks upward.

**Code shape.** Four short methods:
`select(...).eq("name", name) .maybeSingle()` for the gets, `upsert(...)` for
the saves. supabase-js reports failures as `{ error }` instead of throwing, so
each method must **throw on `error`**. Otherwise a database outage would look
like "student not found". The Controller then answers 500 (decision 45).
Target: `createSupabaseRepository` fits on one screen.

**Secrets and security** (the repository is public):

- The server uses the **service key**, which bypasses row-level security, so
  it is read only from the environment (`SUPABASE_SERVICE_KEY`), never
  committed, and never sent to a browser.
- Row-level security is on with **no policies**, so the public `anon` key
  cannot read the password hashes.
- Passwords stay hashed by Auth before they reach the database (decision 42).

**The race (decision 28)** is still there and is now a real one: two requests
really do interleave over a network. We keep it as a documented limitation. A
later extension could fix it with a Postgres function, but that would change
the Repository interface, so it is out of scope here.

**Costs students should know about.** Each student needs their own Supabase
project (or a shared one with the keys), an account, and a network. The Keyv
version needs nothing. This is the main reason to keep both versions.

## 5. Open questions

1. **Organization.** Branch `with-supabase` (recommended), or another option
   from section 3?
2. **When to branch.** After steps 8 and 9 on `main` (recommended), or now,
   from `1693a9f`?
3. **Schema.** JSON column for enrollments (recommended), or a normalized
   `enrollments` table?
4. **Mutation testing.** A Repository that talks to a network database is slow
   and flaky under Stryker. Recommended: exclude `repository.ts` from the
   Stryker run on the branch, say so in the README, and rely on the contract
   tests. The honest cost is that "100% mutation score" would then cover every
   module except the Repository.
5. **Where tests run.** Contract tests need a real database. Recommended: a
   separate hosted test project, with `.env` credentials, and the Supabase
   contract tests **skipped when the variables are absent**, so `npm test`
   still passes offline. The alternative is a local Supabase through the
   Supabase CLI, which needs Docker (heavier on Windows).
6. **Pointing students to the branch.** Add one line to `main`'s README that
   names the `with-supabase` branch (more discoverable, slightly less clean),
   or leave `main` untouched?

## 6. Workplan

Each step is test first, then code, then lint, typecheck and tests green, then
commit. Decisions are logged as they are made.

0. **Settle the questions above.** Create the Supabase projects. Check that
   the current `@supabase/supabase-js` works with Node 24 here, and read the
   current free-tier limits and any pause-on-inactivity rule (verify; do not
   assume).
1. **Branch.** After step 9 on `main`, tag `v2-keyv` and create
   `with-supabase`.
2. **Schema.** Write `supabase/schema.sql` and run it in the test project.
3. **Contract tests first.** Add the Supabase repository to the shared
   contract, skipped without credentials, with a clean-tables step before each
   test. Watch them fail.
4. **Repository.** Write `createSupabaseRepository`, including a test that an
   `error` from the client makes the method throw. Contract tests pass.
5. **Remove Keyv.** Delete the two factories and both dependencies; move the
   end-to-end tests to the fake repository; make the restart test
   Supabase-only.
6. **Wire and document.** `server.ts`, `.env.example`, `.gitignore`, the
   README (setup, secrets, resetting the demo data with a `truncate`), and
   `demo.sh`'s header. Run the real demo, including `./demo.sh restart`.
7. **Review and publish.** Lint, typecheck, tests, and (per question 4)
   Stryker on the other modules. Confirm `git diff main..with-supabase -- src`
   shows only `repository.ts` and `server.ts`. Log the decisions and push the
   branch.

### Done when

- `main` still builds, passes its tests and runs its demo, unchanged.
- On `with-supabase`, the demo works against Supabase, including surviving a
  restart, and the source diff against `main` is only `repository.ts` and
  `server.ts`.
- No secret is in the repository, and `.env.example` lists every variable.
- You can switch the version students see in one step, and back.

### Risks

- **Setup friction** for students (accounts, keys, network).
- **Flaky or slow tests** from the network; limited by the skip rule and a
  separate test project.
- **Free-tier limits or pausing** could make a live demo fail; check before
  class.
- **Leaked key** in a public repository; limited by the environment-only rule
  and by keeping `.env` ignored.
