# Tiny Counter Server: Design and Workplan

## 1. Design

### Behavior

`POST /count` with JSON body `{ "user": "alice", "password": "secret" }`

| Case                       | Status | Body                             |
| -------------------------- | ------ | -------------------------------- |
| Body malformed (fails Zod) | 400    | `{ "error": "Invalid request" }` |
| Credentials wrong          | 401    | `{ "error": "Unauthorized" }`    |
| Authorized                 | 200    | `{ "count": N }`                 |

Only authorized calls increment the counter (so "how many times it's been
called by an authorized user" holds). Invalid and unauthorized requests never
reach the Counter.

### Modules and interfaces

```
 HTTP request ──► Controller ──► Auth.isAuthorized(creds) ──► boolean
                      │
                      └─(if true)──► Counter.increment() ──► number
                      │
 HTTP response ◄──────┘
```

**Auth** (`src/auth.ts`)

```ts
export interface Auth {
  isAuthorized(creds: Credentials): boolean;
}
export type Credentials = { user: string; password: string };
export function createAuth(): Auth; // hides the user/password store
```

Hidden: how credentials are stored and compared. Starts as one hardcoded pair
(e.g. `alice`/`secret`). Plain text is a deliberate simplification; a note in
the file says real systems hash passwords.

**Counter** (`src/counter.ts`)

```ts
export interface Counter {
  increment(): number;
}
export function createCounter(): Counter; // hides the mutable count (closure)
```

Hidden: where the number lives. Returns total calls including this one.

**Controller** (`src/controller.ts`)

```ts
export function createApp(auth: Auth, counter: Counter): Express;
```

Owns: Express routing, the Zod schema (`{ user: string, password: string }`,
both non-empty), mapping outcomes to status codes. Knows nothing about how
auth or counting work, only their interfaces.

**Entry point** (`src/server.ts`): wires
`createApp(createAuth(), createCounter())` and calls `listen`. Kept separate
from `createApp` so Supertest can use the app without opening a port.

### Design choices (good teaching points)

- **Factory functions with injected dependencies** instead of module-level
  globals. Tests get a fresh counter each time, and students can see the
  dependency arrows.
- **Interfaces are the contract.** The Controller imports only the `Auth` and
  `Counter` types, so either can be swapped (e.g. DB-backed counter) without
  touching the Controller.
- **Credentials in the JSON body**, as the spec says Zod validates the body.
  Simple, but a real API would use an `Authorization` header; mention in
  lecture.
- **Plain TypeScript, no extra layers** (no DI framework, no classes required)
  to keep it small.

### File layout

```
package.json  tsconfig.json  vitest.config.ts  stryker.config.json
src/  auth.ts  counter.ts  controller.ts  server.ts
test/ auth.test.ts  counter.test.ts  controller.test.ts
```

Expected size: roughly 80 lines of source.

## 2. Workplan

1. **Scaffold**: `npm init`; install `express`, `zod`; dev: `typescript`,
   `tsx`, `vitest`, `supertest`, `@types/express`, `@types/supertest`,
   `@types/node`, `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`.
   Add `tsconfig.json` (strict) and scripts: `dev`, `test`, `mutations`.
2. **Counter** (test first): first call returns 1, then 2, 3; two counters are
   independent.
3. **Auth** (test first): correct pair accepted; wrong password, unknown user,
   empty strings rejected.
4. **Controller** (test first with Supertest, using stub Auth/Counter): 200 +
   count for valid creds; 401 for bad creds and Counter _not_ called; 400 for
   missing field, wrong type, non-JSON body, and Auth _not_ called; count
   increases across calls.
5. **Server entry point**: wire modules, listen on `PORT` (default 3000).
   Smoke-test with `curl`.
6. **End-to-end test**: real Auth + real Counter through Supertest (3
   sequential calls give 1, 2, 3).
7. **Mutation testing**: run Stryker, fix surviving mutants with added tests
   (good in-class demo).
8. **Polish**: short README with the curl example and a module diagram; check
   that each file is readable on one screen.

### Done when

- All tests pass and Stryker's mutation score is high (target ≥ 90%).
- The curl example returns `{"count":1}`, then `{"count":2}`.
- Each satisfaction condition in CLAUDE.md maps to a test or visible
  structure.

## 3. Decision log

| #   | Decision                                                                                                                                                                        | Status               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 1   | Credentials go in the JSON body, not an `Authorization` header                                                                                                                  | Confirmed 2026-11-21 |
| 2   | Route and method: `POST /count`                                                                                                                                                 | Confirmed 2026-11-21 |
| 3   | Failed auth attempts don't increment the counter                                                                                                                                | Confirmed 2026-11-21 |
| 4   | Keep the existing ESLint and Prettier setup                                                                                                                                     | Confirmed 2026-11-21 |
| 5   | Keep `keyv` as a dependency; it is needed for the next increment (not used in this one)                                                                                         | Confirmed 2026-11-21 |
| 6   | Use factory functions with injected dependencies (`createApp(auth, counter)`) instead of module-level globals                                                                   | Confirmed 2026-11-21 |
| 7   | Imports name the real file (`from "../src/auth.ts"`), enabled by `allowImportingTsExtensions` in tsconfig                                                                       | Confirmed 2026-11-21 |
| 8   | Keep the error handler as a typed `const badJson: ErrorRequestHandler` rather than inlining it; the annotation types its four parameters                                        | Confirmed 2026-11-22 |
| 9   | Initialized a local git repo (branch `main`) and made the first commit (`38d5d07`) after step 6; no remote                                                                      | Done 2026-11-22      |
| 10  | Show the server first with a curl script (`demo.sh`); keep the Supertest tests (with `await`) as the automated versions, and explain `await` in a comment in `test/app.test.ts` | Confirmed 2026-11-22 |
| 11  | Add `.gitattributes` (`*.sh text eol=lf`) so `demo.sh` keeps LF line endings on Windows checkouts                                                                               | Confirmed 2026-11-22 |
| 12  | Rename the npm script `mutate` to `mutations` (Stryker's own `mutate` config key is unchanged)                                                                                  | Confirmed 2026-11-23 |
| 13  | Rename `vitest.config.ts` to `vitest.config.mjs` so the project ESLint rules allow its dev-dependency import; add a README                                                      | Confirmed 2026-11-23 |
| 14  | The single authorized user is `alice` / `secret`                                                                                                                                | Confirmed 2026-11-23 |
| 15  | Error replies are `{ "error": "Invalid request" }` (400) and `{ "error": "Unauthorized" }` (401)                                                                                | Confirmed 2026-11-23 |
| 16  | Empty `user` or `password` is a malformed request (400), not an unauthorized one (401)                                                                                          | Confirmed 2026-11-23 |
| 17  | Publish to GitHub as a public repo, `neu-se/m02-architecture-examples-spring-2027` (remote `origin`, branch `main`)                                                             | Done 2026-11-24      |
