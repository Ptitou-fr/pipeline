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
textes affichés, commentaires du code et messages de commit. Cette règle
prime sur les préférences globales (répondre dans la langue du message, commits
en anglais).

Les commits gardent le préfixe du dépôt (`chore:`, `feat:`, …) suivi d'une
description en français, et conservent le trailer `Co-Authored-By` de Claude
Code.

Exception : les identifiants du code et les noms de dossiers et de fichiers sont
en anglais.

## État

Lots 1 à 6 faits (voir `lots.md`). Un menu latéral (`components/app-sidebar.tsx`,
`components/sidebar-nav.tsx`) mène aux trois vues avec leur nombre de contacts
(`countViews`). `/` est la vue Pipeline (`listPipeline`, `components/pipeline-board.tsx`) :
une colonne par étape, chaque carte avec son état de relance (`followUpStatus`),
déplacée par glisser-déposer HTML5 ou par ses boutons « Étape précédente » /
« Étape suivante » (`adjacentStage`). `/contacts` liste les contacts triés par
nom, filtrés par `?q=` (`searchContacts`, nom ou entreprise, sans casse ni accents) ;
`/contacts/new` les ajoute, `/contacts/[id]/edit` les modifie dans le même
formulaire (`components/contact-form.tsx`), puis on revient sur `/contacts`. Étapes du pipeline dans
`services/stages.ts`, changées depuis la liste ou le tableau (`changeStage`). Vue « À relancer » sur
`/follow-ups` (`listFollowUps`, date du jour locale par `localToday`). Validation par schéma Zod et
doublons décidés par `services/contacts.ts`, longueurs maximales dans
`MAX_LENGTH`. Base Turso par `@libsql/client` (`TURSO_DATABASE_URL`,
`TURSO_AUTH_TOKEN`, voir `.env.example`) ; sans URL, en local, le fichier
`.data/pipeline.db`, ignoré par git. Seul `data/contacts.ts` importe le client,
et ses fonctions sont asynchrones.

## Couches

| Couche | Dossier | Peut importer |
|---|---|---|
| Présentation | `app/`, `components/` | `services/` |
| Service | `services/` | `data/` |
| Données | `data/` | la base (`@libsql/client`) |

Vocabulaire : toujours présentation, service, données, comme dans
`INTENT.md`. Une règle par couche dans `.claude/rules/` (`presentation.md`,
`service.md`, `data.md`), chargée quand on touche ses dossiers.

`pnpm lint` fait échouer tout import contraire (règle `no-restricted-imports`
dans `eslint.config.mjs`, alias `@/` et chemins relatifs), y compris celui de
`@libsql/client` (ses sous-chemins et `libsql`) hors de `data/`. Changer de pilote : mettre à jour `DRIVER` dans
cette même règle.

## Commandes

pnpm uniquement (`packageManager: pnpm@10.32.1`).

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint` (ESLint 9, config plate, `eslint-config-next` core-web-vitals + typescript)
- `pnpm test` (`vitest run`) ; un fichier : `pnpm vitest run chemin/vers/fichier.test.ts` ; un test : ajouter `-t "nom"`
- Ajouter un composant shadcn : `pnpm dlx shadcn@latest add <nom>`

Tests : dans un dossier `__tests__/` à l'intérieur de chaque couche, nommés
`*.test.ts(x)`. `vitest.config.mts` déclare l'alias `@` et l'environnement
`node` ; les composants se testent par `renderToStaticMarkup` (pas de jsdom).
Les tests de `data/` fixent `TURSO_DATABASE_URL` sur un fichier libSQL temporaire
(`file:…`), jamais `.data/pipeline.db` ni la base Turso.

## Règles transverses

- Dépendances à sens unique : présentation → service → données. Seule la
  couche données importe le pilote de la base ou écrit des requêtes ; c'est
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
  `app/globals.css`. Constaté une fois : après une modification de
  `globals.css`, `pnpm dev` a continué de servir l'ancien CSS jusqu'à un
  redémarrage.

## Déploiement : Vercel et Turso

En production depuis le 2026-11-21.

- Projet Vercel `pipeline`, relié à ce dépôt : chaque push sur `main` déploie
  la production, chaque push sur une autre branche crée une préversion.
- Accès : Vercel Authentication sur tous les déploiements (domaines
  personnalisés compris) ; c'est la restriction « en dehors de l'app »
  d'`INTENT.md`. Ne pas créer de lien de partage ni de contournement, même
  pour une vérification.
- Région des fonctions : `pdx1` (Oregon), à côté de la base Turso en
  `aws-us-west-2`. Changer l'une, c'est changer l'autre : chaque page fait
  plusieurs allers-retours vers la base.
- Node `24.x`, comme en local.
- `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN` sont posées en Production
  seulement. Une préversion n'a pas de base et refuse de l'ouvrir : c'est voulu,
  pour qu'aucun essai n'écrive dans les vrais contacts.
- La base et le jeton Turso se gèrent hors du dépôt, par Patrick. Aucune valeur
  dans le code, les commits ou les PR : le dépôt est public.
- En local, `.env.local` peut contenir les valeurs de production, commentées par
  défaut. Décommentées, `pnpm dev` lit et écrit les vrais contacts.

## Design system : Menthe

Choisi parmi les options de `design-options.html` (référence visuelle, clair et
sombre). Il vit dans les tokens shadcn de `app/globals.css` (`:root` et
`.dark`, en oklch, `--radius: 0.875rem`) : styler avec les utilitaires
Tailwind qui en découlent (`bg-primary`, `text-muted-foreground`,
`rounded-lg`…), jamais avec des couleurs en dur.

- Polices : Plus Jakarta Sans (`font-sans`, titres en `font-bold`) et DM Mono
  (`font-mono`), chargées par `next/font` dans `app/layout.tsx` et reliées par
  `@theme inline`.
- Boutons : `components/ui/button.tsx` (shadcn, adapté à Menthe : `rounded-full`,
  tailles relevées). Tout bouton passe par ce composant, jamais par un
  `<button>` stylé à la main. Un `shadcn add` qui réécrit ce fichier efface
  l'adaptation.
- Le mode sombre s'active par la classe `.dark` sur `<html>`. Un script en ligne
  dans le `<head>` (`THEME_SCRIPT`, `components/theme.ts`) la pose avant le premier
  affichage, d'après le cookie `theme`, sinon le réglage du système ; le
  sélecteur du menu (`components/theme-toggle.tsx`) écrit la classe et le
  cookie. Le serveur ne lit pas le cookie : `cookies()` dans le layout racine
  casserait le prérendu avec `cacheComponents`.
- shadcn en style `base-nova` sur `@base-ui/react` (pas Radix) ; les composants
  vont dans `@/components/ui`, les icônes viennent de `lucide-react`. `cn` est
  réexporté depuis le paquet `cn` dans `lib/utils.ts`.
