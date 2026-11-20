"use client";
// Couche présentation : choix de l'étape d'un contact, directement dans la liste (lot 4).
// La valeur choisie part brute au service, qui la valide ; la liste est ensuite rafraîchie.
import { useTransition } from "react";
import { changeContactStage } from "@/app/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STAGE_LABELS, STAGES } from "@/services/stages";

const ITEMS = STAGES.map((stage) => ({ value: stage, label: STAGE_LABELS[stage] }));

export function StageSelect({ contactId, contactName, stage }: { contactId: number; contactName: string; stage: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      items={ITEMS}
      defaultValue={stage}
      disabled={pending}
      onValueChange={(value) => startTransition(() => changeContactStage(contactId, value))}
    >
      <SelectTrigger size="sm" aria-label={`Étape de ${contactName}`}>
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
  );
}
