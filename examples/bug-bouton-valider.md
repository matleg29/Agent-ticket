## Résumé
Corriger le bouton « Valider le panier » inactif sur iOS Safari

## Contexte
- Sur iOS Safari, le bouton reste grisé alors que le panier contient un article.
- Un rafraîchissement le rend actif : le contournement n'est pas acceptable.
- Le client ne peut pas finaliser sa commande sur iOS Safari.

## User story
En tant que client sur iOS Safari, je veux que le bouton « Valider le panier » soit actif dès qu'un article est présent, afin de finaliser ma commande.

## Périmètre
- Rendre le bouton actif dès qu'au moins un article est dans le panier.
- Rendre le bouton inactif quand le panier est vide.
- Garder le compteur d'articles exact après un deuxième ajout.

## Critères d'acceptation
- Étant donné un panier contenant un article, quand le client l'ouvre sur iOS Safari, alors le bouton est actif.
- Étant donné un panier vide, quand le client l'ouvre, alors le bouton reste inactif.
- Étant donné un deuxième article ajouté, quand le client ouvre le panier, alors le bouton reste actif et le compteur est exact.

## Hors périmètre
- Refonte du panier ou de son ergonomie.
- Correction des autres navigateurs, non concernés.

## Risques et dépendances
- Régression possible sur l'état du bouton en navigation privée : à vérifier.

## Notes
- Constaté sur iOS 18.2, Safari, application web en production.
- Ajouter un test de non-régression sur l'état du bouton.
