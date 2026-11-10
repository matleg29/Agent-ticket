#!/bin/bash
# Vérifie la connexion Jira avec les identifiants enregistrés.
# Usage : bash scripts/check-jira.sh
set -euo pipefail

creds="$HOME/.dsh/jira/credentials.env"
if [ ! -f "$creds" ]; then
  echo "Identifiants absents. Lancez d'abord : bash scripts/set-jira-credentials.sh" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$creds"
set +a

base="${ATLASSIAN_BASE_URL:-https://${ATLASSIAN_SITE_NAME}.atlassian.net}"

code=$(curl -s -o /tmp/dsh-jira-myself.json -w '%{http_code}' \
  -u "${ATLASSIAN_USER_EMAIL}:${ATLASSIAN_API_TOKEN}" \
  -H 'Accept: application/json' \
  "$base/rest/api/3/myself")

if [ "$code" != "200" ]; then
  echo "Échec (HTTP $code) :" >&2
  head -c 500 /tmp/dsh-jira-myself.json >&2
  echo >&2
  exit 1
fi

echo "Connexion Jira OK :"
display_name="$(plutil -extract displayName raw -o - /tmp/dsh-jira-myself.json 2>/dev/null || true)"
email_address="$(plutil -extract emailAddress raw -o - /tmp/dsh-jira-myself.json 2>/dev/null || true)"
account_id="$(plutil -extract accountId raw -o - /tmp/dsh-jira-myself.json 2>/dev/null || true)"
echo "  compte : ${display_name:-?} | ${email_address:-?} | ${account_id:-?}"

# Vérification du projet Jira configuré dans le contexte produit.
config="$HOME/.dsh/pm-tickets/config.json"
project_key=""
if [ -f "$config" ]; then
  project_key="$(plutil -extract jira.key raw -o - "$config" 2>/dev/null || true)"
fi

if [ -z "$project_key" ]; then
  echo "Aucun projet Jira configuré : l'agent posera la question au prochain lancement."
  exit 0
fi

code=$(curl -s -o /tmp/dsh-jira-project.json -w '%{http_code}' \
  -u "${ATLASSIAN_USER_EMAIL}:${ATLASSIAN_API_TOKEN}" \
  -H 'Accept: application/json' \
  "$base/rest/api/3/project/$project_key") || code="000"

if [ "$code" = "200" ]; then
  project_name="$(plutil -extract name raw -o - /tmp/dsh-jira-project.json 2>/dev/null || true)"
  echo "Projet configuré : $project_key ($project_name)"
else
  echo "Avertissement : le projet $project_key n'est pas accessible (HTTP $code) — vérifiez la clé dans ~/.dsh/pm-tickets/config.json."
fi

exit 0
