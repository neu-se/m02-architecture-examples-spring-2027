import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/controller.ts";

describe("Controller", () => {
  it("returns 400 for a body that is not valid JSON", async () => {
    const res = await request(createApp())
      .post("/anything")
      .set("Content-Type", "application/json")
      .send("{not json");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid request" });
  });
});
