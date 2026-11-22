"use client";
// Couche présentation : choix de l'étape d'un contact, directement dans la liste (lot 4).
// La valeur choisie part brute au service, qui la valide ; la liste est ensuite rafraîchie.
import { useOptimistic, useState, useTransition } from "react";
import { changeContactStage } from "@/app/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STAGE_LABELS, STAGES } from "@/services/stages";

const ITEMS = STAGES.map((stage) => ({ value: stage, label: STAGE_LABELS[stage] }));

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
          startTransition(async () => {
            showStage(value);
            setFailed(false);
            const result = await changeContactStage(contactId, value);
            setFailed(result.status !== "updated");
          })
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
