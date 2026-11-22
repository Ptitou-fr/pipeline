import { beforeEach, describe, expect, it, vi } from "vitest";
import { refresh } from "next/cache";
import { changeStage, type ChangeStageResult, type Contact } from "@/services/contacts";
import { changeContactStage } from "@/app/actions";

// On teste le chaînage de l'action, pas les règles : la couche service et le cache sont simulés.
vi.mock("@/services/contacts", () => ({
  changeStage: vi.fn(),
  createContact: vi.fn(),
  updateContact: vi.fn(),
}));
vi.mock("next/cache", () => ({ refresh: vi.fn(), revalidatePath: vi.fn() }));

const contact: Contact = {
  id: 1,
  name: "Ada",
  company: null,
  email: null,
  phone: null,
  followUpDate: null,
  stage: "won",
};

describe("changeContactStage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passe l'id et l'étape bruts au service", async () => {
    vi.mocked(changeStage).mockReturnValue({ status: "updated", contact });
    await changeContactStage(1, "won");
    expect(changeStage).toHaveBeenCalledWith(1, "won");
  });

  it.each<ChangeStageResult>([{ status: "updated", contact }, { status: "invalid" }, { status: "not_found" }])(
    "renvoie le résultat du service ($status) et rafraîchit la liste",
    async (result) => {
      vi.mocked(changeStage).mockReturnValue(result);
      await expect(changeContactStage(1, "won")).resolves.toEqual(result);
      expect(refresh).toHaveBeenCalledOnce();
    },
  );
});
