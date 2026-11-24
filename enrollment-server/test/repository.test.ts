import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createFileRepository,
  createMemoryRepository,
  type Repository,
  type Student,
} from "../src/repository.ts";
import { createFakeRepository } from "./fakeRepository.ts";

const sam: Student = {
  name: "sam",
  passwordHash: "hash-of-sam",
  enrollments: { yoga: "active", chess: "dropped" },
};

// The behavior every Repository must have. We run it against the fake used in
// the Service tests too, to check that the fake behaves like the real thing.
function repositoryContract(name: string, makeRepository: () => Repository) {
  describe(`${name} satisfies the Repository contract`, () => {
    it("returns undefined for a student that was never saved", async () => {
      expect(await makeRepository().getStudent("nobody")).toBeUndefined();
    });

    it("returns undefined for an activity that was never saved", async () => {
      expect(await makeRepository().getActivity("nothing")).toBeUndefined();
    });

    it("returns a saved student", async () => {
      const repository = makeRepository();
      await repository.saveStudent(sam);
      expect(await repository.getStudent("sam")).toEqual(sam);
    });

    it("returns a saved activity", async () => {
      const repository = makeRepository();
      await repository.saveActivity({ name: "yoga" });
      expect(await repository.getActivity("yoga")).toEqual({ name: "yoga" });
    });

    it("replaces a student when it is saved again", async () => {
      const repository = makeRepository();
      await repository.saveStudent(sam);
      await repository.saveStudent({ ...sam, enrollments: { swim: "active" } });
      expect((await repository.getStudent("sam"))?.enrollments).toEqual({ swim: "active" });
    });

    it("keeps a student and an activity with the same name apart", async () => {
      const repository = makeRepository();
      await repository.saveStudent({ name: "yoga", passwordHash: "h", enrollments: {} });
      expect(await repository.getActivity("yoga")).toBeUndefined();
    });

    it("is not changed by editing a record after saving it", async () => {
      const repository = makeRepository();
      const student = structuredClone(sam);
      await repository.saveStudent(student);
      student.enrollments.swim = "active";
      expect(await repository.getStudent("sam")).toEqual(sam);
    });

    it("is not changed by editing a record that was read", async () => {
      const repository = makeRepository();
      await repository.saveStudent(sam);
      const student = await repository.getStudent("sam");
      if (!student) throw new Error("student should have been saved");
      student.enrollments.swim = "active";
      expect(await repository.getStudent("sam")).toEqual(sam);
    });
  });
}

describe("Repository", () => {
  let directory: string;
  let fileCount = 0;
  const newFile = () => join(directory, `store-${fileCount++}.json`);

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "enrollment-test-"));
  });

  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  repositoryContract("the fake", createFakeRepository);
  repositoryContract("the in-memory repository", () => createMemoryRepository());
  repositoryContract("the file-backed repository", () => createFileRepository(newFile()));

  describe("file-backed repository", () => {
    it("keeps its data when a new repository is opened on the same file", async () => {
      const file = newFile();
      const before = createFileRepository(file);
      await before.saveStudent(sam);
      await before.saveActivity({ name: "yoga" });

      const afterRestart = createFileRepository(file); // as if the server restarted
      expect(await afterRestart.getStudent("sam")).toEqual(sam);
      expect(await afterRestart.getActivity("yoga")).toEqual({ name: "yoga" });
    });

    it("does not share data between different files", async () => {
      const first = createFileRepository(newFile());
      const second = createFileRepository(newFile());
      await first.saveStudent(sam);
      expect(await second.getStudent("sam")).toBeUndefined();
    });
  });

  describe("in-memory repository", () => {
    it("does not share data between repositories", async () => {
      const first = createMemoryRepository();
      const second = createMemoryRepository();
      await first.saveStudent(sam);
      expect(await second.getStudent("sam")).toBeUndefined();
    });
  });
});
