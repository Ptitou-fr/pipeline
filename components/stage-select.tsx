"use client";
// Couche présentation : choix de l'étape d'un contact, directement dans la liste (lot 4).
// La valeur choisie part brute au service, qui la valide ; la liste est ensuite rafraîchie.
import { useOptimistic, useState, useTransition } from "react";
import { changeContactStage } from "@/app/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ChangeStageResult } from "@/services/contacts";
import { STAGE_LABELS, STAGES } from "@/services/stages";

const ITEMS = STAGES.map((stage) => ({ value: stage, label: STAGE_LABELS[stage] }));

type ChooseStageDeps = {
  show: (stage: string | null) => void;
  setFailed: (failed: boolean) => void;
  save: (contactId: number, stage: unknown) => Promise<ChangeStageResult>;
};

// Choix d'une étape : l'afficher tout de suite, l'enregistrer, puis signaler un échec.
// Séparé du composant pour être testé sans navigateur (issue #12).
export async function chooseStage(contactId: number, value: string | null, { show, setFailed, save }: ChooseStageDeps) {
  show(value);
  setFailed(false);
  const result = await save(contactId, value);
  setFailed(result.status !== "updated");
}

export function StageSelect({ contactId, contactName, stage }: { contactId: number; contactName: string; stage: string }) {
  const [pending, startTransition] = useTransition();
  // L'étape choisie ne s'affiche que pendant l'enregistrement ; ensuite le sélecteur reprend
  // `stage`, l'étape réellement enregistrée, renvoyée par le rafraîchissement.
  const [shownStage, showStage] = useOptimistic<string | null>(stage);
  const [failed, setFailed] = useState(false);
  const errorId = `stage-${contactId}-error`;

  return (
    <div className="flex flex-col items-end gap-1">
      <Select
        items={ITEMS}
        value={shownStage}
        disabled={pending}
        onValueChange={(value) =>
          startTransition(() => chooseStage(contactId, value, { show: showStage, setFailed, save: changeContactStage }))
        }
      >
        <SelectTrigger size="sm" aria-label={`Étape de ${contactName}`} aria-describedby={failed ? errorId : undefined}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {failed && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          L’étape n’a pas été enregistrée.
        </p>
      )}
    </div>
  );
}
