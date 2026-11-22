---
paths:
  - "data/**"
---

# Couche données

Dossier : `data/`. Seule couche qui parle à la base.

## Règles

- Seule couche qui importe le pilote de la base et écrit des requêtes.
- N'importe ni la couche service ni la présentation.
- Aucune règle métier : lire, écrire, renvoyer. Ce qui décide va dans la
  couche service.
- La base est remplaçable : les fonctions exportées ne laissent passer aucun
  type ni objet du pilote. Changer de base ne doit modifier que `data/`.
- Les données survivent aux redémarrages et aux redéploiements Vercel : pas de
  stockage en mémoire ni en fichier local.
- Pilote : `@libsql/client` (Turso). Il est interdit hors de `data/`, avec ses
  sous-chemins et le paquet `libsql`, par la règle `no-restricted-imports` de
  `eslint.config.mjs` (constante `DRIVER`).
- Les fonctions exportées sont asynchrones (`Promise`) : c'est le contrat
  commun aux bases managées, il ne change pas avec la base.
- Base : `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN` (voir `.env.example`).
  Sans URL, en local : le fichier `.data/pipeline.db`. Sur Vercel (`VERCEL`
  défini), l'URL est obligatoire, sinon erreur.
- Le schéma est créé et migré au premier accès, une seule fois par instance,
  même pour des requêtes simultanées.
- Les tests fixent `TURSO_DATABASE_URL` sur un fichier temporaire
  (`file:…`) : jamais `.data/pipeline.db`, jamais la base Turso.

## Comment vérifier

- `pnpm lint` : échoue si `data/` importe la couche service ou la présentation,
  et si le pilote est importé ailleurs que dans `data/`.
- Pilote importé hors de `data/`, doit ne rien renvoyer :
  `git grep -nE "from ['\"](@libsql/|libsql)" -- . ':!data'`
- Aucun type du pilote dans les signatures exportées de `data/`.
