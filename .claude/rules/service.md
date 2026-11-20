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
- Toute entrée venue de l'extérieur (champ de formulaire, paramètre d'URL, id…)
  est validée par un schéma Zod dans le service, sans exception :
  - chaque fonction exportée qui reçoit une telle entrée la type `unknown` (ou
    `Record<string, unknown>`) et la passe à `schema.safeParse` avant tout
    usage ; jamais de `as`, de `String(…)` ou de `Number(…)` pour la
    contourner ;
  - le schéma couvre le type, les champs obligatoires, le format et la longueur
    maximale ; les limites vivent dans le service (`MAX_LENGTH`) ;
  - rien n'est transmis à la couche données si la validation échoue ;
  - la présentation transmet les valeurs brutes sans valider ni convertir, et
    la couche données ne revalide pas.
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
- Validation Zod : chaque fonction exportée de `services/` qui reçoit une
  entrée extérieure appelle `safeParse` ; ses tests couvrent au moins une
  valeur de mauvais type, une valeur absente et une valeur trop longue, et
  vérifient que la couche données (simulée) n'est pas appelée.
- Entrées converties hors du service, doit ne rien renvoyer :
  `git grep -nE "(String|Number|parseInt)\((formData|params|searchParams)|as (number|string)\b" -- app components`
