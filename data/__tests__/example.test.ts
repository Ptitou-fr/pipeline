import { describe, expect, it } from "vitest";
import { getExample } from "@/data/example";

describe("data/example", () => {
  it("renvoie la valeur fixe", () => {
    expect(getExample()).toBe("exemple");
  });
});
