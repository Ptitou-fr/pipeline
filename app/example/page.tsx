// Route /example : montre l'exemple vide qui traverse les trois couches.
import { Example } from "@/components/example";

export default function ExamplePage() {
  return (
    <main className="p-8">
      <Example />
    </main>
  );
}
