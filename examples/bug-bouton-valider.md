# BOUTIQUE-142 — Le bouton « Valider le panier » reste inactif sur iOS Safari

## Contexte et problème

Sur mobile iOS Safari, après l'ajout d'un article depuis la fiche produit, le bouton « Valider le panier » reste grisé alors que le panier contient bien l'article. Le client ne peut pas finaliser sa commande.

## Étapes de reproduction

1. Ouvrir une fiche produit sur iOS Safari.
2. Ajouter l'article au panier.
3. Ouvrir le panier.

## Attendu

Le bouton « Valider le panier » est actif dès qu'au moins un article est présent.

## Observé

Le bouton reste inactif ; un rafraîchissement de la page le rend actif.

## Environnement

- iOS 18.2, Safari
- Application web, production
- Compte client standard

## Impact

Blocage total de la commande sur iOS Safari. Contournement : rafraîchir la page.

## Critères d'acceptation

1. Étant donné un panier contenant un article, quand le client l'ouvre sur iOS Safari, alors le bouton « Valider le panier » est actif.
2. Étant donné un panier vide, quand le client l'ouvre, alors le bouton « Valider le panier » reste inactif.
3. Étant donné le correctif déployé, quand le client ajoute un deuxième article, alors le bouton reste actif et le compteur d'articles est exact.

## Hors périmètre

- Refonte du panier ou de son ergonomie.
- Correction des autres navigateurs, non concernés.

## Notes

- Vérifier sur iOS Safari et Chrome Android avant de clore.
- Ajouter un test de non-régression sur l'état du bouton.
