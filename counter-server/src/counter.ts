// Counter module: counts how many times it has been called.
// Information hiding: callers see only `increment`; the count is kept in the
// store it is given, and callers never see the key or the store.

import type { Keyv } from "keyv";

import type { Counter } from "./interfaces.ts";

export function createCounter(store: Keyv): Counter {
  return {
    async increment() {
      // Read, add one, write back. Two calls at the very same moment could
      // both read the same count; a real system would use an atomic increment.
      const count = ((await store.get<number>("count")) ?? 0) + 1;
      await store.set("count", count);
      return count;
    },
  };
}
