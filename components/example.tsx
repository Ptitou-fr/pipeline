// Couche présentation : affiche, sans règle métier. N'appelle que la couche service.
import { readExample } from "@/services/example";

export function Example() {
  return <p>{readExample()}</p>;
}
