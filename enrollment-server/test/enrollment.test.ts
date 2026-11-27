// End-to-end tests: the real Controller, Auth, Service and Repository, with
// only the network left out. They tell the story of the recreation center.

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Express } from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createAuth } from "../src/auth.ts";
import { createApp } from "../src/controller.ts";
import {
  createFileRepository,
  createMemoryRepository,
  type Repository,
} from "../src/repository.ts";
import { createService } from "../src/service.ts";

const admin = { user: "admin", password: "root" };
const sam = { user: "sam", password: "pw-sam" };

function buildApp(repository: Repository): Express {
  return createApp(createAuth(repository, "root"), createService(repository));
}

describe("Enrollment app", () => {
  let repository: Repository;
  let app: Express;

  const post = (path: string, body: object) => request(app).post(path).send(body);
  const signUp = (who: object, activity: string) => post(`/activities/${activity}/signups`, who);
  const drop = (who: object, activity: string) => post(`/activities/${activity}/drops`, who);

  beforeEach(async () => {
    repository = createMemoryRepository();
    app = buildApp(repository);
    for (const name of ["yoga", "chess", "swim", "climb"]) {
      await post("/activities", { ...admin, name });
    }
    await post("/students", sam);
  });

  it("limits a student to 3 activities and never lets a dropped one back", async () => {
    for (const activity of ["yoga", "chess", "swim"]) {
      expect((await signUp(sam, activity)).status).toBe(200);
    }

    const fourth = await signUp(sam, "climb");
    expect(fourth.status).toBe(409);
    expect(fourth.body).toEqual({ error: "limit" });

    expect((await drop(sam, "yoga")).status).toBe(200);
    expect((await signUp(sam, "climb")).status).toBe(200);

    const again = await signUp(sam, "yoga");
    expect(again.status).toBe(409);
    expect(again.body).toEqual({ error: "previously-dropped" });
  });

  it("counts each student's activities separately", async () => {
    await post("/students", { user: "kim", password: "pw-kim" });
    for (const activity of ["yoga", "chess", "swim"]) await signUp(sam, activity);

    expect((await signUp({ user: "kim", password: "pw-kim" }, "yoga")).status).toBe(200);
  });

  it("rejects signing up twice and dropping what was never joined", async () => {
    await signUp(sam, "yoga");

    expect((await signUp(sam, "yoga")).body).toEqual({ error: "already-enrolled" });
    expect((await drop(sam, "chess")).body).toEqual({ error: "not-enrolled" });
  });

  it("reports an activity that was never created", async () => {
    expect((await signUp(sam, "polo")).status).toBe(404);
    expect((await drop(sam, "polo")).status).toBe(404);
  });

  it("lets only the admin create activities", async () => {
    expect((await post("/activities", { ...sam, name: "polo" })).status).toBe(403);
    expect((await post("/activities", { user: "admin", password: "x", name: "polo" })).status).toBe(
      401,
    );
    expect((await post("/activities", { ...admin, name: "yoga" })).status).toBe(409);
  });

  it("does not let a student act with someone else's password", async () => {
    expect((await signUp({ user: "sam", password: "pw-kim" }, "yoga")).status).toBe(401);
    expect((await signUp({ user: "nobody", password: "x" }, "yoga")).status).toBe(401);
  });

  it("rejects duplicate student names and the reserved name admin", async () => {
    expect((await post("/students", { user: "sam", password: "other" })).status).toBe(409);
    expect((await post("/students", { user: "admin", password: "mine" })).status).toBe(400);
    expect((await post("/activities", { user: "admin", password: "mine", name: "x" })).status).toBe(
      401,
    );
  });

  it("stores a hash, not the password", async () => {
    const stored = await repository.getStudent("sam");

    expect(stored?.passwordHash).not.toContain("pw-sam");
  });
});

describe("Enrollment app with a data file", () => {
  let folder: string;

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), "enrollment-e2e-"));
  });
  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it("remembers students, activities and drops after a restart", async () => {
    const file = join(folder, "data.json");
    const first = buildApp(createFileRepository(file));
    await request(first)
      .post("/activities")
      .send({ ...admin, name: "yoga" });
    await request(first).post("/students").send(sam);
    await request(first).post("/activities/yoga/signups").send(sam);
    await request(first).post("/activities/yoga/drops").send(sam);

    const restarted = buildApp(createFileRepository(file));
    const res = await request(restarted).post("/activities/yoga/signups").send(sam);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "previously-dropped" });
  });
});
