// Interfaces for the counter server's modules.
// Callers depend only on these; implementations live in their own files.

export type Credentials = { user: string; password: string };

export interface Auth {
  isAuthorized(credentials: Credentials): boolean;
}

export interface Counter {
  /** Resolves to the total number of calls so far, including this one. */
  increment(): Promise<number>;
}
