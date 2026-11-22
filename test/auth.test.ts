import { describe, expect, it } from "vitest";

import { createAuth } from "../src/auth.ts";

describe("Auth", () => {
  const auth = createAuth();

  it("accepts the authorized user with the correct password", () => {
    expect(auth.isAuthorized({ user: "alice", password: "secret" })).toBe(true);
  });

  it("rejects the right user with the wrong password", () => {
    expect(auth.isAuthorized({ user: "alice", password: "wrong" })).toBe(false);
  });

  it("rejects an unknown user, even with the known password", () => {
    expect(auth.isAuthorized({ user: "mallory", password: "secret" })).toBe(false);
  });

  it("rejects empty credentials", () => {
    expect(auth.isAuthorized({ user: "", password: "" })).toBe(false);
  });
});
