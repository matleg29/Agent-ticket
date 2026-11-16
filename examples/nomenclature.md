# Nomenclature maison — mode d'emploi

Ces fichiers sont des exemples de **référence de style** : l'agent les lit pour imiter votre façon
d'écrire un ticket, jamais pour recopier leur contenu.

## Ajouter vos propres exemples

1. Le dossier existe déjà après l'installation :
   `C:\Users\<votre-nom>\.dsh\pm-tickets\examples\` sous Windows,
   `~/.dsh/pm-tickets/examples/` sous macOS.
2. Déposez-y un fichier `.md` par ticket, nommé d'après le type et le sujet :
   `story-<sujet>.md`, `bug-<sujet>.md`, `task-<sujet>.md`.
3. Ou copiez-le avec le programme fourni, sous Windows :

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\add-example.ps1 -Source C:\chemin\mon-ticket.md
   ```

   Sous macOS :

   ```bash
   bash scripts/add-example.sh ~/Documents/mon-ticket.md bug-mon-sujet.md
   ```

Un exemple court mais complet vaut mieux qu'un long ticket partiel. Deux ou trois exemples par type
suffisent.

## Le gabarit de référence

Vos exemples montrent votre vocabulaire, ils ne changent pas la structure. L'agent suit ce gabarit,
dans cet ordre :

| Section | Contenu | Facultative |
|---|---|---|
| Résumé | Une phrase, 100 caractères au plus, sans préfixe de type | Non |
| Contexte | 2 à 4 puces : qui, situation actuelle, impact | Non |
| User story | « En tant que…, je veux…, afin de… » | Non |
| Périmètre | 3 à 6 puces, verbes d'action | Non |
| Critères d'acceptation | 3 à 6, Gherkin français, une ligne par critère | Non |
| Hors périmètre | Puces | Oui, omise si vide |
| Risques et dépendances | Puces : tickets liés, équipes, contraintes | Oui, omise si vide |
| Notes | Puces : liens, maquettes, questions ouvertes | Oui, omise si vide |

Budget indicatif : **1 500 caractères** hors logigramme. Pas de « Definition of Done » séparée : ce
qui reste utile va dans une puce de **Notes**.

## Ce que l'agent imite

- l'ordre et l'intitulé exact des sections ;
- le vocabulaire métier (personas, noms d'écrans, statuts, produits) ;
- le format des critères d'acceptation (Gherkin ou autre) ;
- le niveau de détail, la longueur et le ton, dans la limite du budget de 1 500 caractères ;
- les libellés, types de ticket et priorités réellement utilisés.

## Priorité des sources

1. Un exemple fourni dans la conversation par l'utilisateur.
2. Les fichiers de `C:\Users\<votre-nom>\.dsh\pm-tickets\examples\` (ou
   `~/.dsh/pm-tickets/examples/` sous macOS).
3. Les exemples livrés avec l'agent (`examples/` du bundle).

À nom de fichier identique, le dossier utilisateur remplace l'exemple livré.
