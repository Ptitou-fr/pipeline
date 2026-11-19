# CLAUDE.md

Ce fichier guide Claude Code (claude.ai/code) lorsqu'il travaille sur le code de ce dépôt.

`INTENT.md` est la spécification canonique du produit et de l'architecture,
tenue par Patrick ; `AGENTS.md` est généré par `next dev`. Les deux sont
importés ci-dessous. En cas de désaccord entre ce fichier et `INTENT.md`,
`INTENT.md` l'emporte.

@INTENT.md
@AGENTS.md

## Langue

Ce projet est entièrement en français : échanges avec Patrick, documentation,
textes de l'interface, commentaires du code et messages de commit. Cette règle
prime sur les préférences globales (répondre dans la langue du message, commits
en anglais).

Les commits gardent le préfixe du dépôt (`chore:`, `feat:`, …) suivi d'une
description en français, et conservent le trailer `Co-Authored-By` de Claude
Code.

Exception : les identifiants du code et les noms de dossiers et de fichiers sont
en anglais.

## État

Les trois couches existent, chacune avec un exemple vide (`example.ts(x)`) et
son test ; aucune fonctionnalité, aucune base. `app/page.tsx` et les
métadonnées de `app/layout.tsx` (dont `lang="en"`) sont encore ceux du modèle.

## Couches

| Couche | Dossier | Peut importer |
|---|---|---|
| Présentation | `app/`, `components/` | `services/` |
| Service | `services/` | `data/` |
| Données | `data/` | la base (pilote pas encore choisi) |

`pnpm lint` fait échouer tout import contraire (règle `no-restricted-imports`
dans `eslint.config.mjs`, alias `@/` et chemins relatifs). Quand le pilote de la
base sera choisi, l'interdire hors de `data/` dans cette même règle.

## Commandes

pnpm uniquement (`packageManager: pnpm@10.32.1`).

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint` (ESLint 9, config plate, `eslint-config-next` core-web-vitals + typescript)
- `pnpm test` (`vitest run`) ; un fichier : `pnpm vitest run chemin/vers/fichier.test.ts` ; un test : ajouter `-t "nom"`
- Ajouter un composant shadcn : `pnpm dlx shadcn@latest add <nom>`

Tests : dans un dossier `__tests__/` à l'intérieur de chaque couche, nommés
`*.test.ts(x)`. `vitest.config.mts` déclare l'alias `@` et l'environnement
`node` ; les composants se testent par `renderToStaticMarkup` (pas de jsdom).

## Règles transverses

- Dépendances à sens unique : interface → service → persistance. Seule la
  couche persistance importe le pilote de la base ou écrit des requêtes ; c'est
  un critère d'acceptation, pas une préférence de style. Les règles métier
  vivent dans la couche service et ont des tests unitaires.
- Les détails produit qu'`INTENT.md` laisse ouverts (champs d'un contact, façon
  de retrouver un contact, étapes du pipeline, règle de relance) ne s'inventent
  pas, même comme valeurs provisoires. Demander.
- Aucun code d'authentification, de droits ni de multi-utilisateur : l'accès est
  restreint en dehors de l'app.
- Les données doivent survivre aux redémarrages et aux redéploiements Vercel :
  pas de stockage en mémoire ni en fichier local en production.

## Spécificités de la stack

- Next.js 16 avec `cacheComponents` et `partialPrefetching` activés dans
  `next.config.ts` ; lire `node_modules/next/dist/docs/` avant d'utiliser les
  API de cache, de chargement de données ou de routage.
- Tailwind v4 est branché via une règle de loader Turbopack dans
  `next.config.ts`, pas via PostCSS ; les jetons de thème sont dans
  `app/globals.css`.
- shadcn en style `base-nova` sur `@base-ui/react` (pas Radix) ; les composants
  vont dans `@/components/ui`, les icônes viennent de `lucide-react`. `cn` est
  réexporté depuis le paquet `cn` dans `lib/utils.ts`.
