// Interfaces for the enrollment server's modules, and the types they use.
// Callers depend only on these; implementations live in their own files.

// ---- Auth ------------------------------------------------------------------

export type Credentials = { user: string; password: string };

export type Identity = { name: string; isAdmin: boolean };

export interface Auth {
  /** Who is this? Resolves to undefined if the credentials are not valid. */
  authenticate(credentials: Credentials): Promise<Identity | undefined>;
  /** Turns a password into the text that is stored in place of it. */
  hashPassword(password: string): Promise<string>;
}

// ---- Service ---------------------------------------------------------------

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

// ---- Repository ------------------------------------------------------------

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
