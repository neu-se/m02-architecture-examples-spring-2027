import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/controller.ts";
import type { Auth, Counter } from "../src/interfaces.ts";

// Stubs let us test the Controller alone, without the real Auth or Counter.
describe("Controller: POST /count", () => {
  const credentials = { user: "alice", password: "secret" };
  let authService: Auth;
  let counterService: Counter;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    authService = { isAuthorized: vi.fn().mockReturnValue(true) };
    counterService = { increment: vi.fn().mockReturnValue(42) };
    app = createApp(authService, counterService);
  });

  it("returns 200 and the counter's value for an authorized user", async () => {
    const res = await request(app).post("/count").send(credentials);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 42 });
    expect(authService.isAuthorized).toHaveBeenCalledWith(credentials);
  });

  it("returns 401 and does not call the counter when Auth rejects", async () => {
    vi.mocked(authService.isAuthorized).mockReturnValue(false);

    const res = await request(app).post("/count").send(credentials);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
    expect(counterService.increment).not.toHaveBeenCalled();
  });

  it.each([
    ["a missing password", { user: "alice" }],
    ["a missing user", { password: "secret" }],
    ["a non-string password", { user: "alice", password: 123 }],
    ["an empty user", { user: "", password: "secret" }],
    ["an empty password", { user: "alice", password: "" }],
    ["an empty object", {}],
  ])("returns 400 and calls neither Auth nor Counter for %s", async (_name, body) => {
    const res = await request(app).post("/count").send(body);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid request" });
    expect(authService.isAuthorized).not.toHaveBeenCalled();
    expect(counterService.increment).not.toHaveBeenCalled();
  });

  it("returns 400 for a body that is not valid JSON", async () => {
    const res = await request(app)
      .post("/count")
      .set("Content-Type", "application/json")
      .send("{not json");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid request" });
    expect(authService.isAuthorized).not.toHaveBeenCalled();
  });

  it("returns 400 when there is no body at all", async () => {
    const res = await request(app).post("/count");

    expect(res.status).toBe(400);
    expect(authService.isAuthorized).not.toHaveBeenCalled();
  });
});
