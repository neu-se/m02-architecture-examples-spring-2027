// Counter module: counts how many times it has been called.
// Information hiding: callers see only `increment`; the count itself is private.

import type { Counter } from "./interfaces.ts";

export function createCounter(): Counter {
  let count = 0;
  return {
    increment() {
      count += 1;
      return count;
    },
  };
}
