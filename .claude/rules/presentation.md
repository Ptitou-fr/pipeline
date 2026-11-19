---
paths:
  - "app/**"
  - "components/**"
---

# Couche présentation

Dossiers : `app/` (routes) et `components/` (dont `components/ui/`, le design
system). Ce que l'utilisateur voit et manipule. Aucune règle métier : tout ce
qui décide (filtrer ou trier selon un critère métier, calculer une date de
relance…) va dans la couche service.

## Règles

- N'importe que la couche service (`@/services/…`), jamais la couche données
  (`@/data/…`) ni le pilote de la base.
- N'utilise que les composants du design system Menthe (`components/ui/`). Si
  un composant manque, l'ajouter avec `pnpm dlx shadcn@latest add <nom>`, puis
  l'adapter à Menthe (ex. boutons en `rounded-full`) avant de l'utiliser.
  Jamais d'élément interactif stylé à la main (`<button>`, `<input>`…).
- Aucune couleur en dur : ni hex, `rgb()`, `oklch()` ou `hsl()`, ni palette
  Tailwind brute (`bg-zinc-50`, `text-black`…), ni valeur arbitraire
  (`bg-[#…]`). Uniquement les utilitaires issus des tokens : `bg-primary`,
  `text-muted-foreground`, `border-border`…
- Les tokens ne se modifient que dans `app/globals.css`.

## Comment vérifier

- `pnpm lint` : échoue si la présentation importe la couche données.
- Couleurs en dur, doit ne rien renvoyer :
  `git grep -nE "#[0-9a-fA-F]{3,8}([^0-9a-zA-Z]|$)|rgba?\(|oklch\(|hsl\(|-\[#|(^|[^a-z-])(bg|text|border|ring|fill|stroke)-(black|white|(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3})" -- app components ':!app/globals.css'`
- Éléments faits main, doit ne rien renvoyer :
  `git grep -nE "<(button|input|select|textarea)([ >/]|$)" -- app components ':!components/ui'`
- Vérifier le rendu dans le navigateur, en clair et en sombre.
