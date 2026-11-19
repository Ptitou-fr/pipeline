import { describe, expect, it, vi } from "vitest";
import { readExample } from "@/services/example";

vi.mock("@/data/example", () => ({ getExample: () => "valeur simulée" }));

describe("services/example", () => {
  it("relaie la valeur de la couche données", () => {
    expect(readExample()).toBe("valeur simulée");
  });
});
