import { describe, expect, it } from "vitest";

import { createCounter } from "../src/counter.ts";

describe("Counter", () => {
  it("returns 1 on the first call", () => {
    expect(createCounter().increment()).toBe(1);
  });

  it("returns the running total, including the current call", () => {
    const counter = createCounter();
    expect(counter.increment()).toBe(1);
    expect(counter.increment()).toBe(2);
    expect(counter.increment()).toBe(3);
  });

  it("keeps separate counters independent", () => {
    const a = createCounter();
    const b = createCounter();
    a.increment();
    a.increment();
    expect(b.increment()).toBe(1);
  });
});
