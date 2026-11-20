import { describe, expect, it } from "vitest";
import { INITIAL_STAGE, STAGE_LABELS, STAGES, stageLabel } from "@/services/stages";

describe("services/stages", () => {
  it("définit les cinq étapes du pipeline, dans l'ordre", () => {
    expect(STAGES.map((stage) => STAGE_LABELS[stage])).toEqual(["À contacter", "Contacté", "En discussion", "Gagné", "Perdu"]);
  });

  it("fait démarrer un nouveau contact à « À contacter »", () => {
    expect(STAGE_LABELS[INITIAL_STAGE]).toBe("À contacter");
  });

  it("donne le libellé d'une étape, ou la valeur brute si elle est inconnue", () => {
    expect(stageLabel("in_discussion")).toBe("En discussion");
    expect(stageLabel("archived")).toBe("archived");
  });
});
