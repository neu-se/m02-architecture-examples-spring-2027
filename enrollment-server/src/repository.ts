// Repository module: stores students and activities.
// Information hiding: callers see only the Repository interface and its record
// types (in interfaces.ts).
// That Keyv is used, and whether records live in memory or a file, is private.

import { Keyv } from "keyv";
import { KeyvFile } from "keyv-file";

import type { Activity, Repository, Student } from "./interfaces.ts";

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
