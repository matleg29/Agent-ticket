#!/bin/bash
# Remet la mise en route de l'agent à zéro, pour revoir les quatre questions.
# La configuration actuelle est sauvegardée avant suppression.
#
# Usage : bash scripts/reset-product-context.sh
set -euo pipefail

config_dir="$HOME/.dsh/pm-tickets"
config_file="$config_dir/config.json"

if [ ! -f "$config_file" ]; then
  echo "Aucune configuration à réinitialiser : la prochaine session posera les quatre questions."
  exit 0
fi

backup="$config_dir/config.backup-$(date +%Y%m%d-%H%M%S).json"
cp "$config_file" "$backup"
rm "$config_file"

echo "Configuration déplacée vers : $backup"
echo "La prochaine session posera les quatre questions de mise en route."
echo "Pour restaurer : cp \"$backup\" \"$config_file\""
