// Counter module: counts how many times it has been called.
// Information hiding: callers see only `increment`; the count itself is private.

export interface Counter {
  /** Returns the total number of calls so far, including this one. */
  increment(): number;
}

export function createCounter(): Counter {
  let count = 0;
  return {
    increment() {
      count += 1;
      return count;
    },
  };
}
