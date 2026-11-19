## Résumé
Corriger le bouton « Valider le panier » inactif sur iOS Safari

## Contexte
- Sur iOS Safari, le bouton reste **grisé** alors que le panier contient un article.
- Un rafraîchissement le rend actif : contournement inacceptable.
- Le client ne peut pas finaliser sa commande sur iOS Safari.

## User story
En tant que client sur iOS Safari, je veux valider mon panier dès qu'il contient un article, afin de commander.

## Périmètre
- Activer le bouton dès qu'au moins un article est dans le panier.
- Désactiver le bouton quand le panier est vide.
- Corriger le compteur d'articles après un deuxième ajout.

## Critères d'acceptation
- Étant donné un panier contenant **1 article**, quand le client l'ouvre sur iOS Safari, alors le bouton est actif.
- Étant donné un panier vide, quand le client l'ouvre, alors le bouton reste inactif.
- Étant donné un deuxième article ajouté, quand le client ouvre le panier, alors le bouton reste actif et le compteur affiche **2**.
- Étant donné un panier de **10 articles**, quand le client l'ouvre, alors le bouton reste actif et le compteur affiche 10.
- Étant donné une perte de connexion, quand le client revient sur le panier, alors le bouton reste inactif et « panier indisponible » s'affiche.

## Exigences non fonctionnelles
- Ouverture du panier en moins de **1 s** sur iPhone 12.
- Fonctionnement sur iOS Safari **17** et **18**.
- Compteur annoncé correctement par VoiceOver.

## Hors périmètre
- Refonte du panier ou de son ergonomie.
- Correction des autres navigateurs, non concernés.

## Hypothèses et questions ouvertes
- Hypothèse : le défaut vient du cache de session iOS — si faux, alors élargir l'analyse au script panier.
- Question ouverte : corriger aussi iOS Chrome — à trancher par l'**équipe mobile**, avant le correctif.

## Risques et dépendances
- Régression possible sur l'état du bouton en navigation privée : à vérifier.
- Dépend du ticket **BOUTIQUE-104** (mise à jour du script panier).

## Notes
- Constaté sur **iOS 18.2**, Safari, application web en production.
- Source : ticket support **#4821**.
- Demandeur : équipe support.

Type proposé : Bug — défaut bloquant en production.
Priorité proposée : Haute — la commande est impossible sur iOS Safari.
