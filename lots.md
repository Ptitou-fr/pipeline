# Lots de Pipeline

Découpage validé de la première version. Un lot est une chose que je fais de
bout en bout, de l'écran à la base. Le lot 1 est le plus petit.

Les choix de chaque lot sont des décisions basiques de première version, prises
là où `INTENT.md` laisse le détail ouvert. Pour l'instant l'app reste en local :
« survivre » veut dire survivre à un redémarrage du serveur local.

## Lot 1 · Ajouter un contact et le voir dans la liste

**Parcours.** J'ouvre la liste de mes contacts, vide au départ. Je remplis le
formulaire d'ajout et je valide. Le contact apparaît dans la liste, enregistré
dans la base locale.

**Choix**

- Champs d'un contact :
  - nom : obligatoire ;
  - entreprise : facultative ;
  - e-mail : facultatif, son format est vérifié s'il est rempli ;
  - téléphone : facultatif.
- La liste est triée par nom.
- Base : SQLite, par le module intégré `node:sqlite` de Node 24.
- Les données sont dans le fichier `.data/pipeline.db`, que git ignore.
- Seule la couche données importe le pilote ; la règle ESLint l'interdit ailleurs.
- La validation se fait dans la couche service et elle est testée.

**Critères d'acceptation**

- [x] Étant donné aucun contact, quand j'ouvre la liste, alors je vois un état vide.
- [x] Étant donné le formulaire rempli correctement, quand je valide, alors le contact apparaît dans la liste.
- [x] Étant donné un nom vide ou un e-mail mal formé, quand je valide, alors aucun contact n'est créé et je vois ce qui ne va pas.
- [x] Étant donné un contact ajouté, quand je redémarre le serveur, alors il est toujours dans la liste.

## Lot 2 · Modifier un contact

**Parcours.** Depuis la liste, j'ouvre un contact en modification. Je change
ses informations et je valide. La liste affiche les nouvelles valeurs.

**Choix**

- La modification se fait dans le même formulaire que l'ajout, prérempli.
- La validation est celle du lot 1.

**Critères d'acceptation**

- [x] Étant donné un contact existant, quand j'ouvre sa modification, alors le formulaire montre ses valeurs actuelles.
- [x] Étant donné une modification valide, quand je valide, alors la liste affiche les nouvelles valeurs.
- [x] Étant donné un nom vidé, quand je valide, alors rien n'est enregistré et je vois ce qui manque.
- [x] Étant donné une modification en cours, quand j'annule, alors le contact reste inchangé.
- [x] Étant donné un contact modifié, quand je redémarre le serveur, alors la modification est conservée.

## Lot 3 · Retrouver un contact

**Parcours.** Je tape un texte dans le champ de recherche au-dessus de la liste.
La liste ne montre que les contacts qui correspondent. Je vide le champ et la
liste complète revient.

**Choix**

- La recherche porte sur un texte contenu dans le nom ou l'entreprise.
- Elle ignore les majuscules et les accents.
- La règle de correspondance vit dans la couche service.

**Critères d'acceptation**

- [x] Étant donné les contacts « Dupont », « Éts Dupuis » et « Martin », quand je cherche « dup », alors seuls « Dupont » et « Éts Dupuis » s'affichent.
- [x] Étant donné un texte en majuscules ou sans accent, quand je cherche, alors les correspondances sont les mêmes.
- [x] Étant donné aucun contact correspondant, quand je cherche, alors je vois un état « aucun résultat ».
- [x] Étant donné une recherche en cours, quand je vide le champ, alors la liste complète revient.

## Lot 4 · Faire avancer un contact dans le pipeline

**Parcours.** Dans la liste, je choisis une nouvelle étape pour un contact. La
liste affiche aussitôt sa nouvelle étape. Le changement est enregistré.

**Choix**

- Étapes, dans l'ordre : À contacter, Contacté, En discussion, Gagné, Perdu.
- Un nouveau contact démarre à « À contacter ».
- On passe librement d'une étape à l'autre.

**Critères d'acceptation**

- [x] Étant donné un nouveau contact, quand il est créé, alors il est à « À contacter ».
- [x] Étant donné un contact à une étape, quand je choisis une autre des cinq étapes, alors la liste affiche sa nouvelle étape.
- [x] Étant donné une étape changée, quand je redémarre le serveur, alors l'étape est conservée.
- [x] Étant donné une étape hors des cinq, quand le service la reçoit, alors il la refuse, et ce cas est testé.

## Lot 5 · Voir qui relancer aujourd'hui

**Parcours.** J'ouvre la vue « À relancer ». Elle liste les contacts que je dois
relancer aujourd'hui. Les autres n'y sont pas.

**Choix**

- Nouveau champ facultatif « date de prochaine relance », dans les formulaires d'ajout et de modification.
- Un contact est à relancer s'il remplit ces deux conditions :
  - cette date est aujourd'hui ou déjà passée ;
  - il n'est ni à « Gagné » ni à « Perdu ».
- Une relance en retard reste visible jusqu'à ce que je change la date.
- « Aujourd'hui » suit l'heure locale de la machine.
- La règle vit dans la couche service. Elle reçoit la date du jour en paramètre, pour être testable.

**Critères d'acceptation**

- [x] Étant donné des contacts dont la date est aujourd'hui ou passée, quand j'ouvre la vue, alors je vois exactement ceux-là.
- [x] Étant donné aucun contact à relancer, quand j'ouvre la vue, alors je vois un état vide.
- [x] Étant donné un contact à relancer demain, quand j'ouvre la vue, alors il n'y est pas aujourd'hui et il y sera demain.
- [x] Étant donné un contact à « Gagné » ou « Perdu » dont la date est passée, quand j'ouvre la vue, alors il n'y est pas.

## Lot 6 · Voir mon pipeline par étapes et déplacer un contact

**Parcours.** J'ouvre l'app : un menu latéral mène à mes trois vues, et
l'accueil montre mon pipeline, une colonne par étape. Je glisse un contact
d'une colonne à l'autre : il change d'étape, et le changement est enregistré.
Je choisis le thème clair ou sombre dans le menu, et l'app s'en souvient.

Référence visuelle : la maquette « Pipeline — refonte » (canevas Claude Design,
https://claude.ai/artifact/EbFaLdKgVzJTyFQZU5RiHM), en clair et en sombre.

**Choix**

- Menu latéral, sur toutes les pages :
  - le bouton « Ajouter un contact » ;
  - trois vues, chacune avec son nombre de contacts : Pipeline (`/`),
    Contacts (`/contacts`), À relancer (`/follow-ups`) ;
  - la vue en cours est marquée comme active ;
  - en bas, le choix du thème : Clair ou Sombre ;
  - à la largeur d'un téléphone, le menu passe au-dessus du contenu.
- Vue Pipeline, à l'accueil (`/`) :
  - une colonne par étape du lot 4, dans le même ordre, avec son nombre de contacts ;
  - dans une colonne, les contacts sont triés par nom, comme la liste ;
  - une colonne vide invite à y déposer un contact ;
  - trop large pour l'écran, le tableau défile horizontalement.
- Une carte montre le nom, l'entreprise et l'état de la relance :
  - « En retard » si le contact est à relancer (lot 5) et que la date est passée ;
  - « Aujourd'hui » s'il est à relancer et que la date est aujourd'hui ;
  - « Relance le JJ/MM » s'il a une date mais n'est pas à relancer ;
  - « Pas de relance » s'il n'a pas de date.
  - Ce classement est une règle métier : il vit dans la couche service, avec la date du jour en paramètre.
- Déplacer un contact :
  - par glisser-déposer d'une colonne à l'autre ;
  - ou au clavier, avec les boutons « Étape précédente » et « Étape suivante » de la carte ;
  - le changement passe par le même service que le lot 4 ;
  - un message confirme le déplacement ;
  - un déplacement refusé ramène la carte dans sa colonne et le signale, comme pour le sélecteur (issue #10).
- Vue Contacts (`/contacts`) : la liste actuelle déménage, avec sa recherche
  (`?q=`), son sélecteur d'étape et son lien « Modifier ».
- Thème :
  - au départ, il suit le réglage clair ou sombre du système ;
  - un choix fait dans le menu est retenu dans un cookie ;
  - un script en ligne dans le `<head>` pose la classe `.dark` sur `<html>` avant le premier affichage, pour éviter un flash du mauvais thème (lire le cookie côté serveur casserait le prérendu avec `cacheComponents`).
- Le design reste Menthe (tokens de `app/globals.css`) : il n'y a ni nouvelle couleur en dur, ni nouveau champ, ni nouvelle étape.

**Critères d'acceptation**

- [x] Étant donné mes contacts, quand j'ouvre `/`, alors je vois une colonne par étape, dans l'ordre du lot 4, chacune avec ses contacts triés par nom et leur nombre.
- [x] Étant donné un contact dans une colonne, quand je le glisse et le dépose dans une autre, alors il apparaît dans cette colonne, et la vue Contacts affiche sa nouvelle étape.
- [x] Étant donné une carte atteinte au clavier, quand j'active « Étape suivante » ou « Étape précédente », alors le contact passe à l'étape voisine.
- [x] Étant donné un déplacement refusé par le service, quand je dépose la carte, alors elle revient dans sa colonne d'origine et je vois que l'étape n'a pas été enregistrée.
- [x] Étant donné un contact déplacé, quand je redémarre le serveur, alors il est toujours dans sa nouvelle colonne.
- [x] Étant donné des contacts avec une relance en retard, du jour, future, ou sans date, quand j'ouvre la vue Pipeline, alors chaque carte affiche le bon état de relance, et ce classement est testé dans la couche service.
- [x] Étant donné n'importe quelle vue, quand je choisis une entrée du menu, alors j'arrive sur cette vue, marquée comme active, et chaque entrée affiche son nombre de contacts.
- [x] Étant donné la vue Contacts, quand je cherche, change une étape ou modifie un contact, alors tout fonctionne comme aux lots 2 à 4.
- [x] Étant donné aucun choix de thème, quand j'ouvre l'app, alors elle suit le réglage clair ou sombre du système.
- [x] Étant donné que j'ai choisi « Sombre », quand je recharge la page, alors l'app s'affiche directement en sombre, sans passer par le clair.

## Commun à tous les lots

Un lot est terminé quand :

- `pnpm lint` et `pnpm test` passent ;
- hors de `data/`, aucun code n'importe le pilote ;
- les vérifications des `.claude/rules/` passent ;
- le rendu Menthe est vérifié en clair et en sombre.

## Plus tard

Le déploiement Vercel remplacera SQLite par une base managée, en ne modifiant
que la couche données. Il couvrira le critère d'`INTENT.md` « après un
redéploiement, mes contacts sont toujours là ».
