// The Controller is tested with stub Auth and Service, so these tests check
// only the HTTP behavior: validation, who may call, and status codes.

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Auth } from "../src/auth.ts";
import { createApp } from "../src/controller.ts";

const ok = { ok: true };
const failure = (reason: string) => ({ ok: false, reason });

// Stub Auth: sam/pw is a student, admin/root is the admin.
const auth: Auth = {
  authenticate: ({ user, password }) => {
    const known = { sam: "pw", admin: "root" }[user] === password;
    return Promise.resolve(known ? { name: user, isAdmin: user === "admin" } : undefined);
  },
  hashPassword: (password) => Promise.resolve(`hashed:${password}`),
};

// Stub Service: every call succeeds unless a test says otherwise.
const service = {
  createStudent: vi.fn(),
  createActivity: vi.fn(),
  signUp: vi.fn(),
  drop: vi.fn(),
};

const sam = { user: "sam", password: "pw" };
const admin = { user: "admin", password: "root" };

function post(path: string, body: object) {
  return request(createApp(auth, service)).post(path).send(body);
}

describe("Controller", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    for (const method of Object.values(service)) method.mockResolvedValue(ok);
  });

  it("returns 400 for a body that is not valid JSON", async () => {
    const res = await request(createApp(auth, service))
      .post("/students")
      .set("Content-Type", "application/json")
      .send("{not json");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid request" });
  });

  it("returns 500 when the Service fails unexpectedly", async () => {
    service.createStudent.mockRejectedValue(new Error("disk full"));
    const res = await post("/students", { user: "kim", password: "secret" });

    expect(res.status).toBe(500);
  });

  describe("POST /students", () => {
    it("creates a student, storing the hash of the password", async () => {
      const res = await post("/students", { user: "kim", password: "secret" });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(ok);
      expect(service.createStudent).toHaveBeenCalledWith("kim", "hashed:secret");
    });

    it.each([{}, { user: "kim" }, { password: "secret" }, { user: "", password: "secret" }])(
      "returns 400 for the malformed body %j",
      async (body) => {
        const res = await post("/students", body);

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Invalid request" });
        expect(service.createStudent).not.toHaveBeenCalled();
      },
    );

    it("returns 409 for a duplicate name", async () => {
      service.createStudent.mockResolvedValue(failure("duplicate"));
      const res = await post("/students", { user: "sam", password: "x" });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: "duplicate" });
    });

    it("returns 400 for the reserved name", async () => {
      service.createStudent.mockResolvedValue(failure("reserved"));
      const res = await post("/students", { user: "admin", password: "x" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "reserved" });
    });
  });

  describe("POST /activities", () => {
    it("lets the admin create an activity", async () => {
      const res = await post("/activities", { ...admin, name: "yoga" });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(ok);
      expect(service.createActivity).toHaveBeenCalledWith("yoga");
    });

    it.each([{}, { ...admin }, { ...admin, name: "" }, { name: "yoga" }])(
      "returns 400 for the malformed body %j",
      async (body) => {
        const res = await post("/activities", body);

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Invalid request" });
        expect(service.createActivity).not.toHaveBeenCalled();
      },
    );

    it("returns 401 for wrong credentials", async () => {
      const res = await post("/activities", { user: "admin", password: "nope", name: "yoga" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(service.createActivity).not.toHaveBeenCalled();
    });

    it("returns 403 for a student who is not the admin", async () => {
      const res = await post("/activities", { ...sam, name: "yoga" });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Forbidden" });
      expect(service.createActivity).not.toHaveBeenCalled();
    });

    it("returns 409 for a duplicate activity", async () => {
      service.createActivity.mockResolvedValue(failure("duplicate"));
      const res = await post("/activities", { ...admin, name: "yoga" });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: "duplicate" });
    });
  });

  describe.each([
    { action: "signups", method: "signUp" as const },
    { action: "drops", method: "drop" as const },
  ])("POST /activities/:name/$action", ({ action, method }) => {
    const path = `/activities/yoga/${action}`;

    it("acts for the authenticated student", async () => {
      const res = await post(path, sam);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(ok);
      expect(service[method]).toHaveBeenCalledWith("sam", "yoga");
    });

    it.each([{}, { user: "sam" }, { password: "pw" }, { user: "sam", password: "" }])(
      "returns 400 for the malformed body %j",
      async (body) => {
        const res = await post(path, body);

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Invalid request" });
        expect(service[method]).not.toHaveBeenCalled();
      },
    );

    it("returns 401 for wrong credentials", async () => {
      const res = await post(path, { user: "sam", password: "nope" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Unauthorized" });
      expect(service[method]).not.toHaveBeenCalled();
    });

    it.each([
      ["no-such-student", 404],
      ["no-such-activity", 404],
      ["already-enrolled", 409],
      ["previously-dropped", 409],
      ["limit", 409],
      ["not-enrolled", 409],
    ])("maps the Service reason %s to status %i", async (reason, status) => {
      service[method].mockResolvedValue(failure(reason));
      const res = await post(path, sam);

      expect(res.status).toBe(status);
      expect(res.body).toEqual({ error: reason });
    });
  });
});
