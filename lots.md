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

- [ ] Étant donné un contact existant, quand j'ouvre sa modification, alors le formulaire montre ses valeurs actuelles.
- [ ] Étant donné une modification valide, quand je valide, alors la liste affiche les nouvelles valeurs.
- [ ] Étant donné un nom vidé, quand je valide, alors rien n'est enregistré et je vois ce qui manque.
- [ ] Étant donné une modification en cours, quand j'annule, alors le contact reste inchangé.
- [ ] Étant donné un contact modifié, quand je redémarre le serveur, alors la modification est conservée.

## Lot 3 · Retrouver un contact

**Parcours.** Je tape un texte dans le champ de recherche au-dessus de la liste.
La liste ne montre que les contacts qui correspondent. Je vide le champ et la
liste complète revient.

**Choix**

- La recherche porte sur un texte contenu dans le nom ou l'entreprise.
- Elle ignore les majuscules et les accents.
- La règle de correspondance vit dans la couche service.

**Critères d'acceptation**

- [ ] Étant donné les contacts « Dupont », « Éts Dupuis » et « Martin », quand je cherche « dup », alors seuls « Dupont » et « Éts Dupuis » s'affichent.
- [ ] Étant donné un texte en majuscules ou sans accent, quand je cherche, alors les correspondances sont les mêmes.
- [ ] Étant donné aucun contact correspondant, quand je cherche, alors je vois un état « aucun résultat ».
- [ ] Étant donné une recherche en cours, quand je vide le champ, alors la liste complète revient.

## Lot 4 · Faire avancer un contact dans le pipeline

**Parcours.** Dans la liste, je choisis une nouvelle étape pour un contact. La
liste affiche aussitôt sa nouvelle étape. Le changement est enregistré.

**Choix**

- Étapes, dans l'ordre : À contacter, Contacté, En discussion, Gagné, Perdu.
- Un nouveau contact démarre à « À contacter ».
- On passe librement d'une étape à l'autre.

**Critères d'acceptation**

- [ ] Étant donné un nouveau contact, quand il est créé, alors il est à « À contacter ».
- [ ] Étant donné un contact à une étape, quand je choisis une autre des cinq étapes, alors la liste affiche sa nouvelle étape.
- [ ] Étant donné une étape changée, quand je redémarre le serveur, alors l'étape est conservée.
- [ ] Étant donné une étape hors des cinq, quand le service la reçoit, alors il la refuse, et ce cas est testé.

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

- [ ] Étant donné des contacts dont la date est aujourd'hui ou passée, quand j'ouvre la vue, alors je vois exactement ceux-là.
- [ ] Étant donné aucun contact à relancer, quand j'ouvre la vue, alors je vois un état vide.
- [ ] Étant donné un contact à relancer demain, quand j'ouvre la vue, alors il n'y est pas aujourd'hui et il y sera demain.
- [ ] Étant donné un contact à « Gagné » ou « Perdu » dont la date est passée, quand j'ouvre la vue, alors il n'y est pas.

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
