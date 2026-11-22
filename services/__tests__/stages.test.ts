import { describe, expect, it } from "vitest";
import { adjacentStage, INITIAL_STAGE, STAGE_LABELS, STAGES, stageLabel } from "@/services/stages";

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

  // Lot 6 : les boutons « Étape précédente » et « Étape suivante » d'une carte.
  it("donne l'étape voisine dans l'ordre du pipeline", () => {
    expect(adjacentStage("to_contact", "next")).toBe("contacted");
    expect(adjacentStage("in_discussion", "next")).toBe("won");
    expect(adjacentStage("won", "next")).toBe("lost");
    expect(adjacentStage("contacted", "previous")).toBe("to_contact");
    expect(adjacentStage("lost", "previous")).toBe("won");
  });

  it("ne donne aucune étape au-delà des extrémités du pipeline", () => {
    expect(adjacentStage("to_contact", "previous")).toBeNull();
    expect(adjacentStage("lost", "next")).toBeNull();
  });

  it("ne donne aucune étape voisine d'une étape inconnue", () => {
    expect(adjacentStage("archived", "next")).toBeNull();
    expect(adjacentStage("archived", "previous")).toBeNull();
  });
});
