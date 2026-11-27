import { beforeEach, describe, expect, it } from "vitest";

import { createAuth } from "../src/authService.ts";
import type { Auth, Repository } from "../src/interfaces.ts";
import { createFakeRepository } from "./fakeRepository.ts";

describe("Auth", () => {
  let repository: Repository;
  let auth: Auth;

  async function addStudent(name: string, password: string) {
    const passwordHash = await auth.hashPassword(password);
    await repository.saveStudent({ name, passwordHash, enrollments: {} });
  }

  beforeEach(async () => {
    repository = createFakeRepository();
    auth = createAuth(repository, "admin-pw");
    await addStudent("sam", "sam-pw");
    await addStudent("kim", "kim-pw");
  });

  describe("hashPassword", () => {
    it("does not contain the password", async () => {
      expect(await auth.hashPassword("sam-pw")).not.toContain("sam-pw");
    });

    it("gives a different hash each time, because of a random salt", async () => {
      expect(await auth.hashPassword("sam-pw")).not.toBe(await auth.hashPassword("sam-pw"));
    });
  });

  describe("authenticate a student", () => {
    it("identifies a student who gives the right password", async () => {
      expect(await auth.authenticate({ user: "sam", password: "sam-pw" })).toEqual({
        name: "sam",
        isAdmin: false,
      });
    });

    it("rejects a wrong password", async () => {
      expect(await auth.authenticate({ user: "sam", password: "wrong" })).toBeUndefined();
    });

    it("rejects another student's password", async () => {
      expect(await auth.authenticate({ user: "sam", password: "kim-pw" })).toBeUndefined();
    });

    it("rejects an unknown user", async () => {
      expect(await auth.authenticate({ user: "nobody", password: "sam-pw" })).toBeUndefined();
    });
  });

  describe("authenticate the admin", () => {
    it("identifies the admin who gives the admin password", async () => {
      expect(await auth.authenticate({ user: "admin", password: "admin-pw" })).toEqual({
        name: "admin",
        isAdmin: true,
      });
    });

    it("rejects a wrong admin password", async () => {
      expect(await auth.authenticate({ user: "admin", password: "wrong" })).toBeUndefined();
    });

    it("never treats a stored student named admin as the admin", async () => {
      await addStudent("admin", "student-pw");
      expect(await auth.authenticate({ user: "admin", password: "student-pw" })).toBeUndefined();
    });
  });
});
