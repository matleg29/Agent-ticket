## Résumé
Suivre l'avancement de sa commande depuis son compte

## Contexte
- Le client ne reçoit qu'un e-mail de confirmation après sa commande.
- Environ 40 demandes « où est ma commande » par semaine au support.
- Aucune visibilité sur la préparation et l'expédition.

## User story
En tant que client ayant commandé, je veux suivre l'avancement de ma commande, afin de savoir quand elle sera livrée sans contacter le support.

## Périmètre
- Afficher le statut (payée, en préparation, expédiée, livrée) sur la page de détail.
- Afficher la date de livraison estimée quand le transporteur la fournit.
- Afficher le lien de suivi transporteur quand un numéro existe.

## Critères d'acceptation
- Étant donné une commande payée, quand le client ouvre le détail, alors le statut et sa date de mise à jour s'affichent.
- Étant donné une commande expédiée avec un numéro, quand le client ouvre le détail, alors le lien de suivi s'affiche.
- Étant donné une commande annulée, quand le client ouvre le détail, alors aucun statut de livraison ne s'affiche.

## Hors périmètre
- Notifications push ou SMS à chaque changement de statut.
- Suivi de la position du colis en temps réel.

## Risques et dépendances
- Date estimée fournie par l'API transporteur : disponibilité variable.
- Dépend du ticket BOUTIQUE-098 (page de détail commande).

## Notes
- Maquette : écran « Suivi de commande ».
- Question ouverte : historique complet des statuts, ou statut courant seulement ?
