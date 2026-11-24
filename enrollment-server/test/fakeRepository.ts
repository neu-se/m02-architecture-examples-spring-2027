// An in-memory Repository for tests. It copies records on the way in and out,
// like a real store would, so a test cannot change stored data by accident.

import type { Activity, Repository, Student } from "../src/repository.ts";

export function createFakeRepository(): Repository {
  const students = new Map<string, Student>();
  const activities = new Map<string, Activity>();

  return {
    getStudent(name) {
      const student = students.get(name);
      return Promise.resolve(student && structuredClone(student));
    },
    saveStudent(student) {
      students.set(student.name, structuredClone(student));
      return Promise.resolve();
    },
    getActivity(name) {
      const activity = activities.get(name);
      return Promise.resolve(activity && structuredClone(activity));
    },
    saveActivity(activity) {
      activities.set(activity.name, structuredClone(activity));
      return Promise.resolve();
    },
  };
}
