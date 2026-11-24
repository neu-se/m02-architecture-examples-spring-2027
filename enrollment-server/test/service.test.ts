import { beforeEach, describe, expect, it } from "vitest";

import type { Repository } from "../src/repository.ts";
import { createService, type Service } from "../src/service.ts";
import { createFakeRepository } from "./fakeRepository.ts";

const ok = { ok: true };

describe("Service", () => {
  let repository: Repository;
  let service: Service;

  beforeEach(async () => {
    repository = createFakeRepository();
    service = createService(repository);
    await service.createStudent("sam", "hash-of-sam");
    for (const activity of ["yoga", "chess", "swim", "climb"]) {
      await service.createActivity(activity);
    }
  });

  describe("createStudent", () => {
    it("stores a new student with no enrollments", async () => {
      expect(await service.createStudent("kim", "hash-of-kim")).toEqual(ok);
      expect(await repository.getStudent("kim")).toEqual({
        name: "kim",
        passwordHash: "hash-of-kim",
        enrollments: {},
      });
    });

    it("rejects a duplicate name and keeps the original", async () => {
      expect(await service.createStudent("sam", "other-hash")).toEqual({
        ok: false,
        reason: "duplicate",
      });
      expect((await repository.getStudent("sam"))?.passwordHash).toBe("hash-of-sam");
    });

    it("rejects the reserved name admin", async () => {
      expect(await service.createStudent("admin", "hash")).toEqual({
        ok: false,
        reason: "reserved",
      });
      expect(await repository.getStudent("admin")).toBeUndefined();
    });
  });

  describe("createActivity", () => {
    it("stores a new activity", async () => {
      expect(await service.createActivity("pottery")).toEqual(ok);
      expect(await repository.getActivity("pottery")).toEqual({ name: "pottery" });
    });

    it("rejects a duplicate name", async () => {
      expect(await service.createActivity("yoga")).toEqual({ ok: false, reason: "duplicate" });
    });
  });

  describe("signUp", () => {
    it("enrolls the student as active", async () => {
      expect(await service.signUp("sam", "yoga")).toEqual(ok);
      expect((await repository.getStudent("sam"))?.enrollments).toEqual({ yoga: "active" });
    });

    it("rejects an unknown activity", async () => {
      expect(await service.signUp("sam", "nope")).toEqual({
        ok: false,
        reason: "no-such-activity",
      });
    });

    it("rejects an unknown student", async () => {
      expect(await service.signUp("nobody", "yoga")).toEqual({
        ok: false,
        reason: "no-such-student",
      });
    });

    it("rejects signing up twice for the same activity", async () => {
      await service.signUp("sam", "yoga");
      expect(await service.signUp("sam", "yoga")).toEqual({
        ok: false,
        reason: "already-enrolled",
      });
    });

    it("allows 3 active activities and rejects the fourth", async () => {
      await service.signUp("sam", "yoga");
      await service.signUp("sam", "chess");
      expect(await service.signUp("sam", "swim")).toEqual(ok);

      expect(await service.signUp("sam", "climb")).toEqual({ ok: false, reason: "limit" });
      expect((await repository.getStudent("sam"))?.enrollments).toEqual({
        yoga: "active",
        chess: "active",
        swim: "active",
      });
    });

    it("lets a student sign up for another activity after dropping one", async () => {
      await service.signUp("sam", "yoga");
      await service.signUp("sam", "chess");
      await service.signUp("sam", "swim");
      await service.drop("sam", "yoga");

      expect(await service.signUp("sam", "climb")).toEqual(ok);
    });

    it("never lets a student rejoin an activity they dropped", async () => {
      await service.signUp("sam", "yoga");
      await service.drop("sam", "yoga");

      expect(await service.signUp("sam", "yoga")).toEqual({
        ok: false,
        reason: "previously-dropped",
      });
    });

    it("reports a dropped activity as dropped, not as over the limit", async () => {
      await service.signUp("sam", "yoga");
      await service.drop("sam", "yoga");
      await service.signUp("sam", "chess");
      await service.signUp("sam", "swim");
      await service.signUp("sam", "climb");

      expect(await service.signUp("sam", "yoga")).toEqual({
        ok: false,
        reason: "previously-dropped",
      });
    });
  });

  describe("drop", () => {
    it("marks the enrollment as dropped but keeps the record", async () => {
      await service.signUp("sam", "yoga");

      expect(await service.drop("sam", "yoga")).toEqual(ok);
      expect((await repository.getStudent("sam"))?.enrollments).toEqual({ yoga: "dropped" });
    });

    it("rejects dropping an activity the student never joined", async () => {
      expect(await service.drop("sam", "yoga")).toEqual({ ok: false, reason: "not-enrolled" });
    });

    it("rejects dropping the same activity twice", async () => {
      await service.signUp("sam", "yoga");
      await service.drop("sam", "yoga");

      expect(await service.drop("sam", "yoga")).toEqual({ ok: false, reason: "not-enrolled" });
    });

    it("rejects an unknown activity", async () => {
      expect(await service.drop("sam", "nope")).toEqual({
        ok: false,
        reason: "no-such-activity",
      });
    });

    it("rejects an unknown student", async () => {
      expect(await service.drop("nobody", "yoga")).toEqual({
        ok: false,
        reason: "no-such-student",
      });
    });
  });
});
