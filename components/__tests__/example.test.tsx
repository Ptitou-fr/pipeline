import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Example } from "@/components/example";

describe("components/example", () => {
  it("affiche la valeur fournie par le service", () => {
    expect(renderToStaticMarkup(<Example />)).toBe("<p>exemple</p>");
  });
});
