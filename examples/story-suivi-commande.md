## Résumé
Suivre l'avancement de sa commande depuis son compte

## Contexte
- Le client ne reçoit qu'un e-mail de confirmation après sa commande.
- Environ **40 demandes** par semaine au support sur l'avancement.
- Aucune visibilité sur la préparation ni l'expédition.

## User story
En tant que client, je veux suivre l'avancement de ma commande, afin de connaître sa livraison sans contacter le support.

## Périmètre
- Afficher le statut (payée, en préparation, expédiée, livrée) sur le détail de commande.
- Afficher la date de livraison estimée quand le transporteur la fournit.
- Afficher le lien de suivi quand un numéro existe.

## Critères d'acceptation
- Étant donné une commande payée, quand le client ouvre le détail, alors le statut et sa date s'affichent.
- Étant donné une commande expédiée, quand le client ouvre le détail, alors le lien de suivi s'affiche.
- Étant donné une commande annulée, quand le client ouvre le détail, alors aucun statut de livraison ne s'affiche.
- Étant donné un transporteur sans date, quand le client ouvre le détail, alors la mention « date non communiquée » s'affiche.
- Étant donné une commande de plus de **12 mois**, quand le client ouvre le détail, alors le lien de suivi reste affiché.
- Étant donné l'API transporteur indisponible **30 secondes**, quand le client ouvre le détail, alors le statut interne s'affiche sans date.

## Exigences non fonctionnelles
- Détail affiché en moins de **1 s** (95e centile).
- Page utilisable au clavier, contraste **WCAG 2.1 AA**.
- Affichage correct à partir de **320 px**.

## Hors périmètre
- Notifications push ou SMS.
- Suivi de la position du colis en temps réel.

## Hypothèses et questions ouvertes
- Hypothèse : date fournie sous **48 h** — si faux, alors afficher « date non communiquée ».
- Question ouverte : historique complet ou statut courant seulement — à trancher par la **cheffe de produit**.

## Risques et dépendances
- Date estimée fournie par l'API transporteur : variable.
- Dépend du ticket **BOUTIQUE-098** (page de détail commande).

## Notes
- Maquette : écran « Suivi de commande ».
- Source : conversation du **12 novembre 2026**.
- Demandeur : support client.

Type proposé : Story — parcours client, valeur directe.
Priorité proposée : Haute — le support traite **40 demandes** par semaine sur ce sujet.
