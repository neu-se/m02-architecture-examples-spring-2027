// Auth module: decides whether a requester is an authorized user.
// Information hiding: callers see only `isAuthorized`; how credentials are
// stored and compared is private and can change without affecting callers.

export type Credentials = { user: string; password: string };

export interface Auth {
  isAuthorized(credentials: Credentials): boolean;
}

export function createAuth(): Auth {
  // One hardcoded user, for teaching. A real system would store hashed
  // passwords and compare them in constant time.
  const authorizedUser = "alice";
  const authorizedPassword = "secret";

  return {
    isAuthorized({ user, password }) {
      return user === authorizedUser && password === authorizedPassword;
    },
  };
}
