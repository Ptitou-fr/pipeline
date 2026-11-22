import { describe, expect, it, vi } from "vitest";
import type { ChangeStageResult, Contact } from "@/services/contacts";
import { chooseStage } from "@/components/stage-select";

// L'action serveur n'est pas appelée ici : elle est remplacée par `save`.
vi.mock("@/app/actions", () => ({ changeContactStage: vi.fn() }));

const contact: Contact = { id: 3, name: "Alice", company: null, email: null, phone: null, followUpDate: null, stage: "won" };

// Issue #12 : ce que fait le sélecteur quand on choisit une étape, dans l'ordre.
function run(result: ChangeStageResult, value: string | null = "won") {
  const calls: string[] = [];
  const save = vi.fn(async (id: number, stage: unknown) => {
    calls.push(`save ${id} ${String(stage)}`);
    return result;
  });
  const deps = {
    show: (stage: string | null) => calls.push(`show ${stage}`),
    setFailed: (failed: boolean) => calls.push(`failed ${failed}`),
    save,
  };
  return { calls, save, done: chooseStage(3, value, deps) };
}

describe("chooseStage", () => {
  it("affiche l'étape choisie, efface l'erreur, enregistre, puis ne signale rien si l'étape est enregistrée", async () => {
    const { calls, done } = run({ status: "updated", contact });
    await done;

    expect(calls).toEqual(["show won", "failed false", "save 3 won", "failed false"]);
  });

  it.each<ChangeStageResult>([{ status: "invalid" }, { status: "not_found" }])(
    "signale l'échec quand l'étape n'est pas enregistrée ($status)",
    async (result) => {
      const { calls, done } = run(result);
      await done;

      expect(calls.at(-1)).toBe("failed true");
    },
  );

  it("transmet la valeur brute à l'action, sans la valider", async () => {
    const { save, done } = run({ status: "invalid" }, null);
    await done;

    expect(save).toHaveBeenCalledWith(3, null);
  });
});
