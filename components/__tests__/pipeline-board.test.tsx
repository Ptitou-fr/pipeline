import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ChangeStageResult, Contact, PipelineColumn, PipelineContact } from "@/services/contacts";
import { moveContact, PipelineBoard, placeContact } from "@/components/pipeline-board";

// L'action serveur n'est pas appelée ici : elle est remplacée par `save`.
vi.mock("@/app/actions", () => ({ changeContactStage: vi.fn() }));

const card = (id: number, name: string, stage: string, extra: Partial<PipelineContact> = {}): PipelineContact => ({
  id,
  name,
  company: null,
  email: null,
  phone: null,
  followUpDate: null,
  stage,
  followUp: "none",
  ...extra,
});

const board = (cards: PipelineContact[]): PipelineColumn[] =>
  (["to_contact", "contacted", "in_discussion", "won", "lost"] as const).map((stage) => ({
    stage,
    contacts: cards.filter((c) => c.stage === stage),
  }));

// Le contenu d'une colonne, repérée par son libellé, dans le HTML rendu.
const column = (html: string, label: string) => html.match(new RegExp(`<section[^>]*aria-label="${label}"[\\s\\S]*?</section>`))?.[0] ?? "";

describe("PipelineBoard : le rendu du tableau (lot 6)", () => {
  it("affiche une colonne par étape, dans l'ordre du lot 4, avec son nombre de contacts", () => {
    const html = renderToStaticMarkup(
      <PipelineBoard columns={board([card(1, "Alice", "contacted"), card(2, "Bruno", "contacted"), card(3, "Chloé", "won")])} />,
    );

    const labels = [...html.matchAll(/<section[^>]*aria-label="([^"]+)"/g)].map((m) => m[1]);
    expect(labels).toEqual(["À contacter", "Contacté", "En discussion", "Gagné", "Perdu"]);
    expect(column(html, "Contacté")).toMatch(/<h2[^>]*>Contacté<\/h2>\s*<span[^>]*>2<\/span>/);
    expect(column(html, "Gagné")).toMatch(/<h2[^>]*>Gagné<\/h2>\s*<span[^>]*>1<\/span>/);
    expect(column(html, "Perdu")).toMatch(/<h2[^>]*>Perdu<\/h2>\s*<span[^>]*>0<\/span>/);
  });

  it("garde dans chaque colonne l'ordre reçu du service", () => {
    const html = renderToStaticMarkup(
      <PipelineBoard columns={board([card(2, "Alice", "contacted"), card(1, "Bruno", "contacted")])} />,
    );

    const contacted = column(html, "Contacté");
    expect(contacted.indexOf("Alice")).toBeLessThan(contacted.indexOf("Bruno"));
  });

  it("montre le nom et l'entreprise sur une carte qu'on peut glisser", () => {
    const html = renderToStaticMarkup(<PipelineBoard columns={board([card(1, "Alice Martin", "to_contact", { company: "Acme" })])} />);

    expect(html).toMatch(/<article[^>]*draggable="true"[^>]*aria-label="Alice Martin, À contacter"/);
    expect(html).toContain("Acme");
  });

  it("invite à déposer un contact dans une colonne vide", () => {
    const html = renderToStaticMarkup(<PipelineBoard columns={board([card(1, "Alice", "to_contact")])} />);

    expect(column(html, "À contacter")).not.toContain("Déposez un contact ici");
    expect(column(html, "Contacté")).toContain("Déposez un contact ici");
  });

  it("fait défiler le tableau horizontalement s'il est trop large", () => {
    const html = renderToStaticMarkup(<PipelineBoard columns={board([])} />);

    expect(html).toContain("overflow-x-auto");
  });

  it("affiche l'état de relance de chaque carte", () => {
    const html = renderToStaticMarkup(
      <PipelineBoard
        columns={board([
          card(1, "Alice", "to_contact", { followUpDate: "2026-11-19", followUp: "overdue" }),
          card(2, "Bruno", "contacted", { followUpDate: "2026-11-20", followUp: "today" }),
          card(3, "Chloé", "in_discussion", { followUpDate: "2026-12-01", followUp: "scheduled" }),
          card(4, "David", "won"),
        ])}
      />,
    );

    expect(column(html, "À contacter")).toContain("En retard");
    expect(column(html, "Contacté")).toContain("Aujourd’hui");
    expect(column(html, "En discussion")).toContain("Relance le 01/12");
    expect(column(html, "Gagné")).toContain("Pas de relance");
  });

  it("propose « Étape précédente » et « Étape suivante » sur chaque carte, désactivés aux extrémités", () => {
    const html = renderToStaticMarkup(
      <PipelineBoard columns={board([card(1, "Alice", "to_contact"), card(2, "Bruno", "contacted"), card(3, "Chloé", "lost")])} />,
    );

    const button = (label: string) => html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))?.[0] ?? "";
    // L'attribut lui-même, pas les classes `disabled:…` du bouton.
    const disabled = (label: string) => / disabled=""/.test(button(label));
    expect(button("Étape suivante pour Alice")).not.toBe("");
    expect(disabled("Étape précédente pour Alice")).toBe(true);
    expect(disabled("Étape suivante pour Alice")).toBe(false);
    expect(disabled("Étape précédente pour Bruno")).toBe(false);
    expect(disabled("Étape suivante pour Bruno")).toBe(false);
    expect(disabled("Étape précédente pour Chloé")).toBe(false);
    expect(disabled("Étape suivante pour Chloé")).toBe(true);
  });
});

describe("placeContact : l'affichage pendant l'enregistrement (lot 6)", () => {
  it("retire le contact de sa colonne et le montre dans la colonne d'arrivée", () => {
    const columns = board([card(1, "Alice", "to_contact"), card(2, "Bruno", "to_contact")]);

    const placed = placeContact(columns, { id: 1, stage: "won" });
    expect(placed.map((c) => [c.stage, c.contacts.map((x) => x.name)])).toEqual([
      ["to_contact", ["Bruno"]],
      ["contacted", []],
      ["in_discussion", []],
      ["won", ["Alice"]],
      ["lost", []],
    ]);
    expect(placed[3].contacts[0].stage).toBe("won");
  });

  it("ne change rien pour un contact inconnu", () => {
    const columns = board([card(1, "Alice", "to_contact")]);

    expect(placeContact(columns, { id: 9, stage: "won" })).toEqual(columns);
  });
});

const alice = { id: 3, name: "Alice", stage: "to_contact" };
const saved: Contact = { id: 3, name: "Alice", company: null, email: null, phone: null, followUpDate: null, stage: "contacted" };

// Ce que fait le tableau quand on dépose une carte ou qu'on active un bouton, dans l'ordre.
function run(result: ChangeStageResult, to: string | null = "contacted") {
  const calls: string[] = [];
  const save = vi.fn(async (id: number, stage: unknown) => {
    calls.push(`save ${id} ${String(stage)}`);
    return result;
  });
  const deps = {
    show: (move: { id: number; stage: string }) => calls.push(`show ${move.id} ${move.stage}`),
    setMessage: (message: { status: string; text: string } | null) =>
      calls.push(message ? `${message.status} ${message.text}` : "message effacé"),
    save,
  };
  return { calls, save, done: moveContact(alice, to, deps) };
}

describe("moveContact : déplacer un contact (lot 6)", () => {
  it("montre la carte dans sa nouvelle colonne, enregistre par l'action du lot 4, puis confirme", async () => {
    const { calls, done } = run({ status: "updated", contact: saved });
    await done;

    expect(calls).toEqual(["show 3 contacted", "message effacé", "save 3 contacted", "moved Alice → Contacté"]);
  });

  it.each<ChangeStageResult>([{ status: "invalid" }, { status: "not_found" }])(
    "signale un déplacement refusé ($status) ; la carte revient d'elle-même avec la liste rafraîchie",
    async (result) => {
      const { calls, done } = run(result);
      await done;

      expect(calls.at(-1)).toBe("failed L’étape de Alice n’a pas été enregistrée.");
    },
  );

  it("ne fait rien quand la carte est déposée dans sa propre colonne", async () => {
    const { calls, save, done } = run({ status: "updated", contact: saved }, "to_contact");
    await done;

    expect(calls).toEqual([]);
    expect(save).not.toHaveBeenCalled();
  });

  it("ne fait rien sans étape d'arrivée (bouton au bout du pipeline)", async () => {
    const { calls, save, done } = run({ status: "updated", contact: saved }, null);
    await done;

    expect(calls).toEqual([]);
    expect(save).not.toHaveBeenCalled();
  });
});
