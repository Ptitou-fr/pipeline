import { beforeEach, describe, expect, it, vi } from "vitest";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { changeStage, createContact, updateContact, type ChangeStageResult, type Contact } from "@/services/contacts";
import { addContact, changeContactStage, editContact } from "@/app/actions";

// On teste le chaînage de l'action, pas les règles : la couche service et le cache sont simulés.
vi.mock("@/services/contacts", () => ({
  changeStage: vi.fn(),
  createContact: vi.fn(),
  updateContact: vi.fn(),
}));
vi.mock("next/cache", () => ({ refresh: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));

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

// Lot 6 : l'accueil devient la vue Pipeline ; après un ajout ou une modification, on revient à la liste,
// désormais sur /contacts, pour que les lots 1 et 2 restent vrais.
describe("retour à la liste après le formulaire", () => {
  beforeEach(() => vi.clearAllMocks());

  const form = () => {
    const data = new FormData();
    data.set("name", "Ada");
    return data;
  };
  const empty = { values: { name: "", company: "", email: "", phone: "", followUpDate: "" } };

  it("après un ajout, revient à la vue Contacts", async () => {
    vi.mocked(createContact).mockReturnValue({ status: "created", contact });
    await addContact(empty, form());
    expect(redirect).toHaveBeenCalledWith("/contacts");
  });

  it("après une modification, revient à la vue Contacts", async () => {
    vi.mocked(updateContact).mockReturnValue({ status: "updated", contact });
    await editContact("1", empty, form());
    expect(redirect).toHaveBeenCalledWith("/contacts");
  });
});
