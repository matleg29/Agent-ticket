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

## Ce que l'agent imite

- l'ordre et l'intitulé exact des sections ;
- le vocabulaire métier (personas, noms d'écrans, statuts, produits) ;
- le format des critères d'acceptation (Gherkin ou autre) ;
- le niveau de détail, la longueur et le ton ;
- les libellés, types de ticket et priorités réellement utilisés.

## Priorité des sources

1. Un exemple fourni dans la conversation par l'utilisateur.
2. Les fichiers de `C:\Users\<votre-nom>\.dsh\pm-tickets\examples\` (ou
   `~/.dsh/pm-tickets/examples/` sous macOS).
3. Les exemples livrés avec l'agent (`examples/` du bundle).

À nom de fichier identique, le dossier utilisateur remplace l'exemple livré.
