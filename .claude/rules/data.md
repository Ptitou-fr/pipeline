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
- Pilote pas encore choisi. Quand il le sera, l'interdire hors de `data/` dans
  la règle `no-restricted-imports` de `eslint.config.mjs`.

## Comment vérifier

- `pnpm lint` : échoue si `data/` importe la couche service ou la présentation
  (et, une fois le pilote ajouté à la règle, si le pilote est importé
  ailleurs).
- Pilote importé hors de `data/`, doit ne rien renvoyer :
  `git grep -nE "from ['\"]<pilote>" -- . ':!data'`
- Aucun type du pilote dans les signatures exportées de `data/`.
