// Repository module: stores students and activities.
// Information hiding: callers see these async methods and these record types.
// That Keyv is used, and whether records live in memory or a file, is private.

import { Keyv } from "keyv";
import { KeyvFile } from "keyv-file";

export type EnrollmentStatus = "active" | "dropped";

export type Student = {
  name: string;
  passwordHash: string;
  // Every activity the student has joined, including the ones they dropped.
  enrollments: Partial<Record<string, EnrollmentStatus>>;
};

export type Activity = { name: string };

export interface Repository {
  getStudent(name: string): Promise<Student | undefined>;
  saveStudent(student: Student): Promise<void>;
  getActivity(name: string): Promise<Activity | undefined>;
  saveActivity(activity: Activity): Promise<void>;
}

function repositoryOn(keyv: Keyv): Repository {
  return {
    getStudent: (name) => keyv.get<Student>(`student:${name}`),
    getActivity: (name) => keyv.get<Activity>(`activity:${name}`),
    async saveStudent(student) {
      await keyv.set(`student:${student.name}`, student);
    },
    async saveActivity(activity) {
      await keyv.set(`activity:${activity.name}`, activity);
    },
  };
}

/** Keeps records in memory. They are lost when the server stops. */
export function createMemoryRepository(): Repository {
  return repositoryOn(new Keyv());
}

/** Keeps records in the given JSON file, so they survive a restart. */
export function createFileRepository(file: string): Repository {
  const store = new KeyvFile({
    filename: file,
    writeDelay: 0, // `await set()` returns once the data is on disk
    serialize: JSON.stringify,
    deserialize: (data) => JSON.parse(data.toString()) as unknown,
  });
  return repositoryOn(new Keyv({ store }));
}
