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
- Pilote : `node:sqlite` (module intégré de Node 24), fichier
  `.data/pipeline.db`. Il est interdit hors de `data/` par la règle
  `no-restricted-imports` de `eslint.config.mjs` (constante `DRIVER`).
- Les tests ouvrent un fichier temporaire via `PIPELINE_DB_PATH`.

## Comment vérifier

- `pnpm lint` : échoue si `data/` importe la couche service ou la présentation,
  et si le pilote est importé ailleurs que dans `data/`.
- Pilote importé hors de `data/`, doit ne rien renvoyer :
  `git grep -nE "from ['\"]node:sqlite" -- . ':!data'`
- Aucun type du pilote dans les signatures exportées de `data/`.
