"use client";
// Couche présentation : la vue Pipeline (lot 6), une colonne par étape, dans l'ordre reçu du service.
// On déplace un contact par glisser-déposer (API HTML5) ou par les boutons « Étape précédente » et
// « Étape suivante » de sa carte. Le changement passe par la même action que le sélecteur du lot 4.
import { CalendarClock, ChevronLeft, ChevronRight, CircleAlert, Clock } from "lucide-react";
import { useOptimistic, useRef, useState, useTransition, type DragEvent } from "react";
import { cn } from "@/lib/utils";
import { changeContactStage } from "@/app/actions";
import { Button } from "@/components/ui/button";
import type { ChangeStageResult, FollowUpStatus, PipelineColumn, PipelineContact } from "@/services/contacts";
import { adjacentStage, STAGE_LABELS, stageLabel, type Stage } from "@/services/stages";

export type Move = { id: number; stage: string };
export type MoveMessage = { status: "moved" | "failed"; text: string };

// Pendant l'enregistrement : le contact quitte sa colonne et apparaît en bas de celle d'arrivée.
// Le rafraîchissement qui suit remet l'ordre du service, ou ramène la carte si l'étape est refusée.
export function placeContact(columns: PipelineColumn[], { id, stage }: Move): PipelineColumn[] {
  const contact = columns.flatMap((column) => column.contacts).find((c) => c.id === id);
  if (!contact) return columns;
  return columns.map((column) => {
    const others = column.contacts.filter((c) => c.id !== id);
    return { ...column, contacts: column.stage === stage ? [...others, { ...contact, stage }] : others };
  });
}

type MoveDeps = {
  show: (move: Move) => void;
  setMessage: (message: MoveMessage | null) => void;
  save: (contactId: number, stage: unknown) => Promise<ChangeStageResult>;
};

// Déplacement d'un contact : le montrer tout de suite à l'arrivée, l'enregistrer, puis confirmer ou
// signaler le refus. Séparé du composant pour être testé sans navigateur, comme `chooseStage`.
export async function moveContact(
  contact: { id: number; name: string; stage: string },
  to: string | null,
  { show, setMessage, save }: MoveDeps,
) {
  if (to === null || to === contact.stage) return;
  show({ id: contact.id, stage: to });
  setMessage(null);
  const result = await save(contact.id, to);
  setMessage(
    result.status === "updated"
      ? { status: "moved", text: `${contact.name} → ${stageLabel(to)}` }
      : { status: "failed", text: `L’étape de ${contact.name} n’a pas été enregistrée.` },
  );
}

// Pastille de couleur de chaque étape, prise dans les tokens Menthe.
const STAGE_DOT: Record<Stage, string> = {
  to_contact: "bg-chart-5",
  contacted: "bg-chart-3",
  in_discussion: "bg-chart-2",
  won: "bg-chart-1",
  lost: "bg-muted-foreground",
};

// AAAA-MM-JJ → JJ/MM, pour l'affichage.
const dayMonth = (date: string | null) => (date ? `${date.slice(8, 10)}/${date.slice(5, 7)}` : "");

function FollowUpBadge({ status, date }: { status: FollowUpStatus; date: string | null }) {
  const badge = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold [&_svg]:size-3.5";
  switch (status) {
    case "overdue":
      return (
        <span className={cn(badge, "bg-destructive/10 text-destructive")}>
          <CircleAlert aria-hidden="true" />
          En retard
        </span>
      );
    case "today":
      return (
        <span className={cn(badge, "bg-accent text-accent-foreground")}>
          <Clock aria-hidden="true" />
          Aujourd’hui
        </span>
      );
    case "scheduled":
      return (
        <span className={cn(badge, "bg-muted text-muted-foreground")}>
          <CalendarClock aria-hidden="true" />
          Relance le {dayMonth(date)}
        </span>
      );
    case "none":
      return <span className="px-1 text-xs text-muted-foreground">Pas de relance</span>;
  }
}

type Direction = "previous" | "next";

export function PipelineBoard({ columns }: { columns: PipelineColumn[] }) {
  const [, startTransition] = useTransition();
  const [shown, show] = useOptimistic(columns, placeContact);
  const [message, setMessage] = useState<MoveMessage | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  // Après un déplacement au clavier, la carte change de colonne : on rend le focus au même bouton.
  const refocus = useRef<{ id: number; direction: Direction } | null>(null);

  const move = (contact: PipelineContact, to: string | null) =>
    startTransition(() => moveContact(contact, to, { show, setMessage, save: changeContactStage }));

  const stepButtonRef = (contact: PipelineContact, direction: Direction) => (element: HTMLButtonElement | null) => {
    const target = refocus.current;
    if (!element || target?.id !== contact.id) return;
    // Au bout du pipeline, le bouton utilisé est désactivé : le focus va à l'autre.
    const usable = adjacentStage(contact.stage, target.direction) !== null ? target.direction : target.direction === "next" ? "previous" : "next";
    if (usable !== direction) return;
    refocus.current = null;
    element.focus();
  };

  const step = (contact: PipelineContact, direction: Direction) => {
    refocus.current = { id: contact.id, direction };
    move(contact, adjacentStage(contact.stage, direction));
  };

  const dragOver = (stage: Stage) => (event: DragEvent<HTMLElement>) => {
    if (dragging === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (over !== stage) setOver(stage);
  };

  const dragLeave = (event: DragEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(null);
  };

  const drop = (stage: Stage) => (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const contact = shown.flatMap((column) => column.contacts).find((c) => c.id === dragging);
    setOver(null);
    setDragging(null);
    if (contact) move(contact, stage);
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div aria-live="polite" className="min-h-6 text-sm font-semibold">
        {message?.status === "moved" && <p className="text-primary">{message.text}</p>}
        {message?.status === "failed" && (
          <p role="alert" className="text-destructive">
            {message.text}
          </p>
        )}
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-stretch gap-4">
          {shown.map((column) => {
            const label = STAGE_LABELS[column.stage];
            return (
              <section
                key={column.stage}
                aria-label={label}
                onDragOver={dragOver(column.stage)}
                onDragLeave={dragLeave}
                onDrop={drop(column.stage)}
                className={cn(
                  "flex min-h-96 w-72 flex-col gap-3 rounded-2xl border border-border bg-muted/60 p-3 transition-colors",
                  over === column.stage && "bg-accent ring-2 ring-primary ring-inset",
                )}
              >
                <div className="flex items-center gap-2 px-1.5 pt-1">
                  <span aria-hidden="true" className={cn("size-2.5 rounded-full", STAGE_DOT[column.stage])} />
                  <h2 className="text-sm font-bold">{label}</h2>
                  <span className="ml-auto rounded-full border border-border bg-card px-2 py-0.5 font-mono text-xs font-medium">
                    {column.contacts.length}
                  </span>
                </div>
                {column.contacts.map((contact) => (
                  <article
                    key={contact.id}
                    draggable
                    aria-label={`${contact.name}, ${label}`}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", contact.name);
                      setDragging(contact.id);
                    }}
                    onDragEnd={() => {
                      setDragging(null);
                      setOver(null);
                    }}
                    className={cn(
                      "flex cursor-grab flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5 text-card-foreground shadow-sm transition hover:-translate-y-px hover:shadow-md active:cursor-grabbing",
                      dragging === contact.id && "-rotate-1 opacity-40",
                    )}
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-bold">{contact.name}</span>
                      {contact.company && <span className="truncate text-sm text-muted-foreground">{contact.company}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <FollowUpBadge status={contact.followUp} date={contact.followUpDate} />
                      <div className="flex shrink-0 gap-0.5">
                        {(["previous", "next"] as const).map((direction) => (
                          <Button
                            key={direction}
                            ref={stepButtonRef(contact, direction)}
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${direction === "next" ? "Étape suivante" : "Étape précédente"} pour ${contact.name}`}
                            disabled={adjacentStage(contact.stage, direction) === null}
                            onClick={() => step(contact, direction)}
                            className="text-muted-foreground"
                          >
                            {direction === "next" ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
                {column.contacts.length === 0 && (
                  <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Déposez un contact ici
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
