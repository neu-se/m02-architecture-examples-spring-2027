// Store: the key-value store the Counter keeps its count in.
// It lives here, not in the Counter, so the Counter never knows whether the
// count is in memory or in a file: tests pass a memory store, the server a file.

import { Keyv } from "keyv";
import { KeyvFile } from "keyv-file";

/** Keeps values in memory. They are lost when the server stops. */
export function createMemoryStore(): Keyv {
  return new Keyv();
}

/** Keeps values in the given JSON file, so they survive a restart. */
export function createFileStore(file: string): Keyv {
  const store = new KeyvFile({
    filename: file,
    writeDelay: 0, // `await set()` returns once the data is on disk
    serialize: JSON.stringify,
    deserialize: (data) => JSON.parse(data.toString()) as unknown,
  });
  return new Keyv({ store });
}
