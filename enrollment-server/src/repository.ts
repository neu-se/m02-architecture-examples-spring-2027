// Repository module: stores students and activities.
// Information hiding: callers see these async methods and these record types.
// Where and how the records are kept (Keyv, a file, memory) is private.

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
