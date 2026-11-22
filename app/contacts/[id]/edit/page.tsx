// Route /contacts/[id]/edit : le formulaire d'ajout, prérempli avec les valeurs actuelles du contact.
// L'id est une donnée de requête : il se lit dans un <Suspense> (Cache Components, pas de generateStaticParams).
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { editContact } from "@/app/actions";
import { ContactForm } from "@/components/contact-form";
import { getContact, MAX_LENGTH } from "@/services/contacts";

async function EditContact({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await getContact(id);
  if (!contact) notFound();

  return (
    <ContactForm
      action={editContact.bind(null, id)}
      limits={MAX_LENGTH}
      submitLabel="Enregistrer"
      cancelHref="/contacts"
      initialValues={{
        name: contact.name,
        company: contact.company ?? "",
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        followUpDate: contact.followUpDate ?? "",
      }}
    />
  );
}

export default function EditContactPage({ params }: PageProps<"/contacts/[id]/edit">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Modifier le contact</h1>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <EditContact params={params} />
      </Suspense>
    </main>
  );
}
