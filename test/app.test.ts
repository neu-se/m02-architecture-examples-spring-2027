import request from "supertest";
import { describe, expect, it } from "vitest";

import { createAuth } from "../src/auth.ts";
import { createApp } from "../src/controller.ts";
import { createCounter } from "../src/counter.ts";

// End-to-end: the real Controller, Auth, and Counter wired together.
//
// These tests make the same requests as demo.sh (curl), but automatically.
// Supertest starts the app on a temporary port and sends real HTTP requests.
// The reply arrives later, so each call returns a Promise, and `await` waits
// for the reply before we look at it.
describe("Counter server (all modules together)", () => {
  const credentials = { user: "alice", password: "secret" };

  it("counts successive authorized calls: 1, 2, 3", async () => {
    const app = createApp(createAuth(), createCounter());

    const first = await request(app).post("/count").send(credentials);
    const second = await request(app).post("/count").send(credentials);
    const third = await request(app).post("/count").send(credentials);

    expect(first.body).toEqual({ count: 1 });
    expect(second.body).toEqual({ count: 2 });
    expect(third.body).toEqual({ count: 3 });
  });

  it("does not count rejected or invalid calls", async () => {
    const app = createApp(createAuth(), createCounter());

    await request(app).post("/count").send({ user: "alice", password: "wrong" }).expect(401);
    await request(app).post("/count").send({ user: "alice" }).expect(400);
    const res = await request(app).post("/count").send(credentials).expect(200);

    expect(res.body).toEqual({ count: 1 });
  });
});
