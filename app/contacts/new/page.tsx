// Route /contacts/new : formulaire d'ajout d'un contact.
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { Button } from "@/components/ui/button";

export default function NewContactPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Nouveau contact</h1>
        <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
          Retour à la liste
        </Button>
      </header>
      <ContactForm />
    </main>
  );
}
