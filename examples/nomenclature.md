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

## Le gabarit de référence

**LA STRUCTURE VIENT DU GABARIT.** Les exemples ne fournissent que le vocabulaire, le ton et le
niveau de détail : ils ne changent ni l'ordre, ni l'intitulé, ni le rôle des sections. L'agent suit
exactement ce gabarit, dans cet ordre :

| Section | Contenu | Facultative |
|---|---|---|
| Résumé | Une phrase, 100 caractères au plus, sans préfixe de type | Non |
| Contexte | 2 à 4 puces : qui, situation actuelle, impact | Non |
| User story | « En tant que…, je veux…, afin de… » | Non |
| Périmètre | 3 à 6 puces, verbes d'action | Non |
| Critères d'acceptation | Gherkin français, imposé : une ligne par critère, 1 nominal, 1 limite et 1 erreur dès que possible, 8 au plus | Non |
| Exigences non fonctionnelles | Puces : performance, volumétrie, accessibilité, mobile, langue, sécurité, conservation | Oui, omise seulement si aucune ne s'applique, avec justification en Notes |
| Hors périmètre | Puces | Oui, omise si vide |
| Hypothèses et questions ouvertes | `Hypothèse : <énoncé> — si faux, alors <impact>.` | Oui, omise si vide |
| Risques et dépendances | Puces : tickets liés, équipes, contraintes | Oui, omise si vide |
| Notes | Puces : liens, maquettes, `Source : …`, `Demandeur : …` | Oui, omise si vide |

Budget : **2 200 caractères** de description. Si le ticket déborde, on coupe dans l'ordre : **Notes**,
puis **Hors périmètre**, puis **Contexte** — jamais dans les critères d'acceptation, les exigences non
fonctionnelles ni les hypothèses. Si ces sections débordent, c'est le périmètre du ticket qui est trop
large : on le découpe en deux, on ne l'appauvrit pas. Pas de « Definition of Done »
séparée : ce qui reste utile va dans une puce de **Notes**. Après le ticket, hors de la description,
deux lignes obligatoires : `Type proposé : …` et `Priorité proposée : …`.

## Ce que l'agent imite

- le vocabulaire métier (personas, noms d'écrans, statuts, produits) ;
- le format des critères d'acceptation (Gherkin français, imposé) ;
- le niveau de détail, la longueur et le ton, dans la limite du budget de **2 200 caractères** ;
- les libellés, types de ticket et priorités réellement utilisés.

La structure, elle, ne s'imite pas : elle vient du gabarit.

## Priorité des sources

1. Un exemple fourni dans la conversation par l'utilisateur.
2. Les fichiers de `C:\Users\<votre-nom>\.dsh\pm-tickets\examples\` (ou
   `~/.dsh/pm-tickets/examples/` sous macOS).
3. Les exemples livrés avec l'agent (`examples/` du bundle).

À nom de fichier identique, le dossier utilisateur remplace l'exemple livré.
