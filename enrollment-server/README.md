# Recreation Center Enrollment Server

A small web server for CS 4530. Students sign up for recreation-center
activities for one semester. It extends the ideas of the
[counter server](../counter-server/) with two new modules: a **Service** that
holds the business rules and a **Repository** that stores the data.

The rules:

1. A student may have at most 3 activities at any time.
2. A student who drops an activity may never sign up for it again.

## Modules

```
  HTTP request
       |
       v
  +------------+  authenticate(), hashPassword()  +------+
  | Controller | -------------------------------> | Auth |---+
  |            |                                  +------+   |
  |            |  createStudent(), signUp(), ...  +---------+ |  getStudent()
  |            | -------------------------------> | Service | |
  +------------+                                  +---------+ |
       |                                               |      |
       v                                               v      v
  HTTP response                                    +------------+
                                                   | Repository | --> Keyv --> file
                                                   +------------+
```

| Module     | File                                   | What it hides                                       |
| ---------- | -------------------------------------- | --------------------------------------------------- |
| Controller | [src/controller.ts](src/controller.ts) | Express and Zod; HTTP status codes                  |
| Auth       | [src/auth.ts](src/auth.ts)             | Password hashing; where the admin password lives    |
| Service    | [src/service.ts](src/service.ts)       | The two rules, and how a student record is laid out |
| Repository | [src/repository.ts](src/repository.ts) | Keyv, the file, and the key names                   |

Each module is created with the modules it needs passed in, and knows them
only through their interfaces. [src/server.ts](src/server.ts) creates them
all. The Service returns results such as `{ ok: false, reason: "limit" }`
instead of throwing, and the Controller turns each reason into a status code.

## The API

Every request is a `POST` with the credentials in the JSON body.

| Endpoint                         | Who                     | Body                               |
| -------------------------------- | ----------------------- | ---------------------------------- |
| `POST /students`                 | anyone                  | `{ user, password }` (new student) |
| `POST /activities`               | the admin only          | `{ user, password, name }`         |
| `POST /activities/:name/signups` | a student, for themself | `{ user, password }`               |
| `POST /activities/:name/drops`   | a student, for themself | `{ user, password }`               |

Success is `201` (something was created) or `200`, with `{ "ok": true }`.
Failure is `{ "error": "..." }`:

| Status | Error                                                             | Meaning                                  |
| ------ | ----------------------------------------------------------------- | ---------------------------------------- |
| 400    | `Invalid request`                                                 | not JSON, or a field is missing or empty |
| 400    | `reserved`                                                        | the name `admin` cannot be a student     |
| 401    | `Unauthorized`                                                    | wrong user or password                   |
| 403    | `Forbidden`                                                       | only the admin may create activities     |
| 404    | `no-such-student`, `no-such-activity`                             | not created yet                          |
| 409    | `duplicate`                                                       | that student or activity already exists  |
| 409    | `already-enrolled`, `limit`, `previously-dropped`, `not-enrolled` | a business rule says no                  |

## Try it

```
npm install
rm -f enrollment-data.json     # start with no data
npm start                      # in one terminal
./demo.sh                      # in another: the whole story, with curl
```

[demo.sh](demo.sh) shows each request and its reply, including every failure.
To see persistence, stop the server, start it again with `npm start`, and run
`./demo.sh restart`: Sam is still refused `yoga`.

## Persistence

The Repository keeps its data in a JSON file (`enrollment-data.json`, or the
path in the `DATA_FILE` environment variable), through Keyv and the
`keyv-file` adapter. The tests use Keyv's in-memory store instead. Because the
Repository interface speaks only of students and activities, the Service does
not know which store is in use.

## The admin password

The admin logs in as `admin` with the password in the `ADMIN_PASSWORD`
environment variable. **If it is not set, the server uses the demo password
`demo-admin-password`. That default is public, so it is for demos only.**
Student passwords are never stored: each is saved as a salted `scrypt` hash.

## Known limitation: a race

The Repository has no transactions. If two sign-ups for the same student
arrive at the same moment, both can read "2 active" and both succeed, giving
the student 4. Two creations of the same name can race the same way. We accept
this in the example, and it makes a good discussion question: where would a
lock or an atomic update go?

## Deliberately not built (the YAGNI ledger)

The scenario did not need these, so they are left out:

- reading data back (list activities, show my enrollments)
- semesters, capacities, schedules, descriptions
- deleting or renaming a student or activity
- password reset or change, sessions, tokens
- roles other than student and admin; the admin acting for a student
- rules for name length or characters, or password strength
- locking against concurrent requests
- a choice of database

## Test it

```
npm test           # unit tests per module, plus end-to-end tests
npm run mutations  # Stryker mutation testing
```

The Service tests use a small fake Repository. One set of contract tests runs
against the fake, the memory store and the file store. The Controller tests
use stub Auth and Service objects.
[test/enrollment.test.ts](test/enrollment.test.ts) runs all the real modules
together.

## Other scripts

`npm run typecheck`, `npm run lint`, `npm run prettier`.

## Design notes

[EXTENSION-1-PLAN.md](EXTENSION-1-PLAN.md) has the critique and the workplan.
[../DECISIONS.md](../DECISIONS.md) records each design decision with the
alternatives and reasons.
