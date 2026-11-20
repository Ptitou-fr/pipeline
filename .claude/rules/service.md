---
paths:
  - "services/**"
---

# Couche service

Dossier : `services/`. Porte les règles métier : tout ce qui décide plutôt
qu'afficher ou stocker. En cas de doute sur ce qui est une règle métier,
demander.

## Règles

- N'importe que la couche données (`@/data/…`), jamais la présentation
  (`@/components/…`, `@/app/…`) ni le pilote de la base.
- Les tests s'écrivent avant le code :
  1. écrire le test dans `services/__tests__/<nom>.test.ts` ;
  2. le lancer et le voir échouer pour la bonne raison ;
  3. écrire le code minimal qui le fait passer ;
  4. relancer : il passe.
- Les entrées venues de l'extérieur (formulaire…) sont validées par un schéma
  Zod dans le service, valeurs brutes comprises : type, champs obligatoires,
  format, longueur maximale. La présentation transmet sans valider.
- Dans les tests, la couche données est simulée (`vi.mock("@/data/…")`) : on
  teste la règle, pas la base.
- Ne pas inventer de règle métier qu'`INTENT.md` laisse ouverte (étapes du
  pipeline, règle de relance…) : demander.

## Comment vérifier

- `pnpm test` : tous les tests passent.
- Chaque fichier de `services/` a son test dans `services/__tests__/`.
- Test écrit avant le code : montrer à Patrick la sortie de l'échec (étape 2)
  avant d'écrire le code. C'est la seule preuve, l'historique git ne suffit
  pas.
- `pnpm lint` : échoue si le service importe la présentation.
