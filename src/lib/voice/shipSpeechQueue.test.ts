import assert from "node:assert/strict";
import { test } from "node:test";
import { createSpeechQueue } from "./shipSpeechQueue.ts";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("plays queued lines in order without interrupting the current one", async () => {
  const order: string[] = [];
  const queue = createSpeechQueue(async (line: string) => {
    order.push(`start:${line}`);
    await delay(20);
    order.push(`end:${line}`);
    return true;
  });

  const first = queue.enqueue("alpha");
  await delay(5);
  const second = queue.enqueue("bravo");

  assert.equal(await first, true);
  assert.equal(await second, true);
  assert.deepEqual(order, [
    "start:alpha",
    "end:alpha",
    "start:bravo",
    "end:bravo",
  ]);
});

test("clear drops waiting lines and lets the active play finish its result", async () => {
  const order: string[] = [];
  const queue = createSpeechQueue(async (line: string) => {
    order.push(`start:${line}`);
    await delay(20);
    order.push(`end:${line}`);
    return true;
  });

  const first = queue.enqueue("alpha");
  await delay(5);
  const second = queue.enqueue("bravo");
  queue.clear();

  assert.equal(await first, false);
  assert.equal(await second, false);
  assert.deepEqual(order, ["start:alpha", "end:alpha"]);
});
