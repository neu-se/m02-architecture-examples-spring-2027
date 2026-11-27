# Tiny Counter Server

A very small web server for CS 4530. A `POST /count` request from an
authorized user returns how many authorized calls the server has handled.

## Modules

```
  HTTP request
       |
       v
  +------------+  isAuthorized(credentials)   +------+
  | Controller | ---------------------------> | Auth |
  |            |  <--- true / false --------- +------+
  |            |
  |            |  increment()                 +---------+
  |            | ---------------------------> | Counter |
  |            |  <--- total so far --------- +---------+
  +------------+
       |
       v
  HTTP response
```

| Module     | File                                   | What it hides                          |
| ---------- | -------------------------------------- | -------------------------------------- |
| Controller | [src/controller.ts](src/controller.ts) | Express and Zod; HTTP status codes     |
| Auth       | [src/auth.ts](src/auth.ts)             | How credentials are stored and checked |
| Counter    | [src/counter.ts](src/counter.ts)       | The key the count is kept under        |
| Store      | [src/store.ts](src/store.ts)           | Keyv; memory or a file                 |

The Controller knows Auth and Counter only through their interfaces.
[src/server.ts](src/server.ts) creates the modules and passes them to the
Controller.

**This is the Keyv version.** The count is kept in a Keyv store that is passed
to the Counter, and the server gives it a file (`counter-data.json`, or
`DATA_FILE`), so the count survives a restart. Keyv is asynchronous, so
`increment()` returns a Promise; that is the only change to the Controller and
its interface. `git diff main` shows everything that differs from version 1.

## The API

`POST /count` with a JSON body containing the credentials:

```json
{ "user": "alice", "password": "secret" }
```

| Situation                                                     | Status | Body                             |
| ------------------------------------------------------------- | ------ | -------------------------------- |
| Authorized                                                    | 200    | `{ "count": 3 }`                 |
| Wrong credentials                                             | 401    | `{ "error": "Unauthorized" }`    |
| Bad body (not JSON, or `user` or `password` missing or empty) | 400    | `{ "error": "Invalid request" }` |

Only authorized calls are counted.

## Try it

```
npm install
npm start          # in one terminal
./demo.sh          # in another: sends six requests with curl
```

[demo.sh](demo.sh) shows each request and the reply, including the 401 and 400
cases.

## Test it

```
npm test           # unit tests per module, plus an end-to-end test
npm run mutations  # Stryker mutation testing
```

The tests are in [test/](test/). The Controller tests use stub Auth and
Counter objects, so they test the Controller alone.

## Other scripts

`npm run typecheck`, `npm run lint`, `npm run prettier`.

## Design notes

[DESIGN.md](DESIGN.md) has the design, the workplan, and a log of each design
decision.
