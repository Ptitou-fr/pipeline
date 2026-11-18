# Intention - projet Pipeline

Auteur : Patrick (le « je » de ce fichier)
Portée : tout le dépôt du projet Pipeline
Dernière vérification par Patrick : 2026-11-18

## Produit

Un mini CRM de prospection, pour une seule personne : moi.
Il me permet de :

- enregistrer et retrouver mes contacts
- faire avancer chaque contact dans mon pipeline
- voir chaque jour qui relancer

Mini : uniquement ces fonctions.

## Architecture

Trois couches, dépendances dans un seul sens : interface → service → persistance.

- **Interface** : ce que l'utilisateur voit et manipule. Aucune règle métier. N'appelle que la couche service, jamais la persistance ni la base.
- **Service** : les règles métier, c'est-à-dire tout ce qui décide plutôt qu'afficher ou stocker. En cas de doute, demander. N'appelle que la couche persistance, jamais la base directement.
- **Persistance** : seule couche qui parle à la base.

La base est remplaçable : passer d'une base légère à une base managée ne modifie que la couche persistance.

A minima, les règles métier ont des tests unitaires.

## Contraintes

Imposé :

- framework : Next.js
- composants d'interface : shadcn
- déploiement : Vercel
- accès : l'app n'est pas publique, je suis le seul à y accéder ; la restriction se fait en dehors de l'app

Les choix techniques non imposés par ce fichier sont laissés à l'agent.

## Hors périmètre

- authentification dans le code de l'app
- gestion de droits
- multi-utilisateur
- les détails produit non écrits dans ce fichier (champs d'un contact, façon de retrouver un contact, étapes du pipeline, règle de relance) : ils seront fixés lors d'itérations futures. Si l'un d'eux manque, demander.

Ne pas les ajouter de sa propre initiative ni les inventer, même partiellement ou par précaution.

## Critères d'acceptation

- J'ajoute un contact, il apparaît dans la liste de mes contacts.
- Je change l'étape d'un contact, la liste de mes contacts affiche sa nouvelle étape.
- Je vois la liste des contacts à relancer aujourd'hui.
- Après un redémarrage ou un redéploiement de l'app, mes contacts sont toujours là.
- Hors de la couche persistance, aucun code n'importe le pilote de la base ni n'écrit de requête vers la base.
- Tous les tests passent.
