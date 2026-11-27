import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createCounter } from "../src/counter.ts";
import { createFileStore, createMemoryStore } from "../src/store.ts";

// The Counter's store is passed in, so these tests use a memory store.
// Keyv is asynchronous, so `increment` returns a Promise and we `await` it.
describe("Counter", () => {
  it("returns 1 on the first call", async () => {
    expect(await createCounter(createMemoryStore()).increment()).toBe(1);
  });

  it("returns the running total, including the current call", async () => {
    const counter = createCounter(createMemoryStore());
    expect(await counter.increment()).toBe(1);
    expect(await counter.increment()).toBe(2);
    expect(await counter.increment()).toBe(3);
  });

  it("keeps separate counters independent", async () => {
    const a = createCounter(createMemoryStore());
    const b = createCounter(createMemoryStore());
    await a.increment();
    await a.increment();
    expect(await b.increment()).toBe(1);
  });
});

describe("Counter with a file store", () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "counter-"));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("keeps its count when the server restarts", async () => {
    const file = join(dir, "data.json");
    await createCounter(createFileStore(file)).increment();
    await createCounter(createFileStore(file)).increment();

    expect(existsSync(file)).toBe(true); // the count went to the file we named

    // A third Counter on the same file stands in for the restarted server.
    expect(await createCounter(createFileStore(file)).increment()).toBe(3);
  });
});
