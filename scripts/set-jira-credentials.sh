#!/bin/bash
# Enregistre les identifiants Jira de l'agent, hors conversation.
# À lancer une fois dans le Terminal : bash scripts/set-jira-credentials.sh
set -euo pipefail

dir="$HOME/.dsh/jira"
mkdir -p "$dir"
chmod 700 "$dir"

# Défaut : le site déjà enregistré, sinon une saisie obligatoire.
default_site=""
if [ -f "$dir/credentials.env" ]; then
  saved_site="$(grep '^export ATLASSIAN_SITE_NAME=' "$dir/credentials.env" | head -1 | cut -d'"' -f2)"
  [ -n "$saved_site" ] && default_site="$saved_site"
fi

printf 'E-mail du compte Atlassian : '
read -r email
if [ -z "$email" ]; then
  echo "E-mail vide : abandon." >&2
  exit 1
fi

printf 'Nom du site Atlassian (ex. mon-entreprise pour mon-entreprise.atlassian.net) [%s] : ' "${default_site:-aucun}"
read -r site
site="${site:-$default_site}"
# Accepte aussi une URL collée : https://mon-entreprise.atlassian.net/... -> mon-entreprise
site="${site#https://}"
site="${site#http://}"
site="${site%%\.*}"
if [ -z "$site" ]; then
  echo "Site Atlassian vide : abandon." >&2
  exit 1
fi

printf 'Token API Atlassian (visible à la saisie, collez-le puis Entrée) : '
read -r token
if [ -z "$token" ]; then
  echo "Token vide : abandon." >&2
  exit 1
fi

umask 077
cat > "$dir/credentials.env" <<EOF
export ATLASSIAN_SITE_NAME="$site"
export ATLASSIAN_USER_EMAIL="$email"
export ATLASSIAN_API_TOKEN="$token"
EOF
chmod 600 "$dir/credentials.env"

echo "Identifiants enregistrés dans $dir/credentials.env (droits 600)."
echo "Le token reste visible dans l'historique du terminal : effacez le scrollback (Cmd+K sur macOS)."
echo "Test : bash \"$(cd "$(dirname "$0")" && pwd)/check-jira.sh\""
