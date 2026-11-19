# Journal des versions

Le produit de ce bundle est le texte d'instructions : chaque version documente ce que l'agent
produit différemment.

## 1.3.0

Objectif : lever le plafond de qualité du ticket, sans l'allonger.

### Le ticket est plus complet

- **Nouvelle section « Exigences non fonctionnelles »** (6e position) : performance, volumétrie,
  accessibilité, mobile, langue, sécurité, conservation des données. Elle ne peut être omise que si
  aucune ne s'applique, et l'omission doit alors être justifiée par une puce en Notes : plus
  d'omission silencieuse.
- **Nouvelle section « Hypothèses et questions ouvertes »** (8e position), sortie de Notes. Chaque
  hypothèse porte son impact : `Hypothèse : <énoncé> — si faux, alors <impact concret>.`
- **Notes** accueille désormais la traçabilité : `Source : …` et `Demandeur : …`.
- **Deux lignes de décision** obligatoires après le ticket : type proposé et priorité proposée, chacune
  justifiée. Elles figuraient déjà dans le déroulé mais étaient absentes du gabarit et des exemples :
  elles disparaissaient par mimétisme.

### Le ticket est mieux écrit

- **Nouvelle section « Comment écrire le ticket »** : exhaustif mais synthétique, phrases courtes
  (20 mots au maximum), puces plutôt que paragraphes, gras sur les valeurs, seuils et statuts qui
  décident (deux ou trois par section au maximum), un seul mot par concept, verbes à l'infinitif,
  aucun méta-discours.
- **Nouvelle étape 5 « Relire avant d'afficher »** dans le déroulé : huit contrôles que l'agent
  s'applique avant de présenter le ticket. Le déroulé passe de 6 à 7 étapes.

### Les critères d'acceptation ne sont plus bridés

- Le plafond « 3 à 6 critères » devient un plancher de couverture : au minimum un cas nominal, plus un
  cas limite et un cas d'erreur dès que le parcours peut échouer, huit critères au maximum. Chaque
  critère porte une valeur observable : un seuil, un message, un état, un délai.
- **Budget : 1 500 → 2 200 caractères.** Les deux exemples livrés saturaient déjà l'ancien budget avec
  le minimum de critères : il était mécaniquement impossible d'ajouter une exigence. La règle de coupe
  est explicite et ordonnée (Notes, puis Hors périmètre, puis Contexte) et **interdit** de couper dans
  les critères, les exigences non fonctionnelles ou les hypothèses : si ça déborde, le ticket est
  découpé, pas appauvri.

### Les contradictions sont tranchées

- **La structure vient du gabarit, sans exception.** Les exemples de référence ne fournissent plus que
  le vocabulaire, le ton et le niveau de détail ; ils ne peuvent plus ajouter, retirer ni renommer une
  section. Le prompt et `examples/nomenclature.md` disaient l'inverse l'un de l'autre.
- **Format des critères : Gherkin français, imposé.** « Gherkin ou autre » disparaît de la doc.
- **Le logigramme se déduit des critères** : une branche correspond à un critère, et réciproquement.
  C'est ce qui empêche le dessin et le texte de raconter deux choses différentes.

### Effet attendu

Un même brief doit produire deux fois le même ticket, avec ses cas d'erreur, ses contraintes non
fonctionnelles et ses hypothèses nommées — sans dépasser la lecture de 30 secondes.

## 1.2.0

- Prérequis MCP Jira, création seule et tickets synthétiques.

Versions antérieures : voir l'historique Git.
