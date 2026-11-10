# BOUTIQUE-101 — Suivre l'avancement de sa commande depuis son compte

## Contexte et problème

Aujourd'hui, un client qui commande ne reçoit qu'un e-mail de confirmation, puis plus aucune information jusqu'à la livraison. Le service client traite environ 40 demandes par semaine du type « où est ma commande ». Les clients n'ont aucune visibilité sur la préparation et l'expédition.

## User story

En tant que client ayant passé une commande, je veux suivre l'avancement de ma commande depuis mon compte, afin de savoir quand elle sera livrée sans contacter le service client.

## Périmètre inclus

- Affichage du statut de la commande (payée, en préparation, expédiée, livrée) sur la page de détail.
- Date de livraison estimée lorsqu'elle est fournie par le transporteur.
- Lien de suivi transporteur lorsqu'un numéro de suivi existe.

## Critères d'acceptation

1. Étant donné une commande payée, quand le client ouvre le détail de sa commande, alors le statut courant et la date de dernière mise à jour s'affichent.
2. Étant donné une commande expédiée avec un numéro de suivi, quand le client ouvre le détail, alors un lien vers le suivi transporteur est affiché.
3. Étant donné une commande livrée, quand le client ouvre le détail, alors la date de livraison réelle est affichée.
4. Étant donné une commande annulée, quand le client ouvre le détail, alors aucun statut de livraison n'est affiché.

## Hors périmètre

- Notifications push ou SMS à chaque changement de statut.
- Suivi de la position du colis en temps réel.
- Modification de l'adresse de livraison après expédition.

## Dépendances et risques

- Dépend de l'API transporteur pour la date estimée, dont la disponibilité varie selon le transporteur.
- Risque : écart entre le statut interne et le statut transporteur ; l'interface doit indiquer la source du statut.

## Definition of Done

- Les quatre critères d'acceptation passent en recette.
- Validation design de la page de détail.
- Événement analytics `order_status_viewed` émis à l'ouverture.

## Notes

- Maquette : Figma « Suivi de commande v2 ».
- Question ouverte : afficher l'historique complet des statuts ou seulement le statut courant ?
