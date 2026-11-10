#!/bin/bash
# Ajoute un exemple de ticket à la bibliothèque de référence de l'agent.
#
# Usage :
#   bash scripts/add-example.sh <ticket.md> [nom-dans-la-bibliotheque.md]
#
# Sans second argument, le nom du fichier source est conservé.
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage : bash scripts/add-example.sh <ticket.md> [nom-dans-la-bibliotheque.md]" >&2
  exit 1
fi

src="$1"
name="${2:-$(basename "$src")}"

if [ ! -f "$src" ]; then
  echo "Fichier introuvable : $src" >&2
  exit 1
fi

case "$name" in
  *.md|*.markdown|*.txt) ;;
  *) name="$name.md" ;;
esac

dir="$HOME/.dsh/pm-tickets/examples"
mkdir -p "$dir"
cp "$src" "$dir/$name"

echo "Exemple ajouté : $dir/$name"
echo "Contenu de la bibliothèque :"
ls -1 "$dir"
