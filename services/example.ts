// Couche service : règles métier. N'appelle que la couche données.
// Exemple vide : relaie la valeur de la couche données.
import { getExample } from "@/data/example";

export function readExample(): string {
  return getExample();
}
