// Service module: the business rules for enrolling in activities.
//   1. A student may have at most 3 active activities.
//   2. A student who drops an activity may never sign up for it again.
// It reports each outcome as a result, and the Controller turns that into HTTP.

import { ADMIN_NAME } from "./admin.ts";
import type { Repository } from "./repository.ts";

const MAX_ACTIVE = 3;

export type Result<Reason extends string> = { ok: true } | { ok: false; reason: Reason };

export interface Service {
  createStudent(name: string, passwordHash: string): Promise<Result<"duplicate" | "reserved">>;
  createActivity(name: string): Promise<Result<"duplicate">>;
  signUp(
    student: string,
    activity: string,
  ): Promise<
    Result<
      "no-such-student" | "no-such-activity" | "already-enrolled" | "previously-dropped" | "limit"
    >
  >;
  drop(
    student: string,
    activity: string,
  ): Promise<Result<"no-such-student" | "no-such-activity" | "not-enrolled">>;
}

const ok = { ok: true } as const;
const fail = <Reason extends string>(reason: Reason) => ({ ok: false, reason }) as const;

export function createService(repository: Repository): Service {
  return {
    async createStudent(name, passwordHash) {
      if (name === ADMIN_NAME) return fail("reserved");
      if (await repository.getStudent(name)) return fail("duplicate");
      await repository.saveStudent({ name, passwordHash, enrollments: {} });
      return ok;
    },

    async createActivity(name) {
      if (await repository.getActivity(name)) return fail("duplicate");
      await repository.saveActivity({ name });
      return ok;
    },

    async signUp(studentName, activityName) {
      const student = await repository.getStudent(studentName);
      if (!student) return fail("no-such-student");
      if (!(await repository.getActivity(activityName))) return fail("no-such-activity");

      const status = student.enrollments[activityName];
      if (status === "active") return fail("already-enrolled");
      if (status === "dropped") return fail("previously-dropped");

      const active = Object.values(student.enrollments).filter((s) => s === "active");
      if (active.length >= MAX_ACTIVE) return fail("limit");

      const enrollments = { ...student.enrollments, [activityName]: "active" as const };
      await repository.saveStudent({ ...student, enrollments });
      return ok;
    },

    async drop(studentName, activityName) {
      const student = await repository.getStudent(studentName);
      if (!student) return fail("no-such-student");
      if (!(await repository.getActivity(activityName))) return fail("no-such-activity");
      if (student.enrollments[activityName] !== "active") return fail("not-enrolled");

      const enrollments = { ...student.enrollments, [activityName]: "dropped" as const };
      await repository.saveStudent({ ...student, enrollments });
      return ok;
    },
  };
}
