import { describe, expect, it } from "vitest";
import { enqueueSave } from "../src/persistence";

describe("serialized settings saves", () => {
  it("lets the rejected caller fail while the next save still runs in order", async () => {
    const events: string[] = [];
    let fail = true;
    let tail = Promise.resolve();
    const save = (value: string) => enqueueSave(tail, () => { events.push(value); if (fail) { fail = false; return Promise.reject(new Error("disk")); } return Promise.resolve(); });
    const first = save("first");
    tail = first.catch(() => undefined);
    const second = save("second");
    await expect(first).rejects.toThrow("disk");
    await expect(second).resolves.toBeUndefined();
    expect(events).toEqual(["first", "second"]);
  });
});
