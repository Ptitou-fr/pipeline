// Couche service : les étapes du pipeline (lot 4), dans l'ordre. Sans dépendance vers la couche
// données, pour pouvoir être importé par un composant client.
import { z } from "zod";

export const STAGES = ["to_contact", "contacted", "in_discussion", "won", "lost"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  to_contact: "À contacter",
  contacted: "Contacté",
  in_discussion: "En discussion",
  won: "Gagné",
  lost: "Perdu",
};

// Un nouveau contact démarre ici.
export const INITIAL_STAGE: Stage = "to_contact";

// Étape venue de l'extérieur : l'une des cinq, rien d'autre.
export const stageSchema = z.enum(STAGES);

export function stageLabel(stage: string): string {
  const parsed = stageSchema.safeParse(stage);
  return parsed.success ? STAGE_LABELS[parsed.data] : stage;
}

// Lot 6 : l'étape voisine dans l'ordre du pipeline (boutons « Étape précédente » et « Étape suivante »).
// Aucune au-delà des extrémités, ni pour une étape inconnue.
export function adjacentStage(stage: string, direction: "previous" | "next"): Stage | null {
  const parsed = stageSchema.safeParse(stage);
  if (!parsed.success) return null;
  return STAGES[STAGES.indexOf(parsed.data) + (direction === "next" ? 1 : -1)] ?? null;
}
