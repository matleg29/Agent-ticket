# Dépannage : connexion Jira et questions fréquentes

## En une minute

- La plupart des pannes viennent de la connexion Jira ou d'une configuration incomplète.
- Deux doubles-clics suffisent à vérifier votre compte : `Configurer-Jira.cmd`, puis `Verifier-Jira.cmd`.
- Lisez le message d'erreur : il indique presque toujours la cause et l'action à mener.

## Vérifier la connexion en deux clics

Votre connexion Jira tient à un **jeton API Atlassian** : une longue clé personnelle, enregistrée une
seule fois dans `C:\Users\<votre-nom>\.dsh\jira\credentials.env`.

1. Double-cliquez sur **`Configurer-Jira.cmd`** pour enregistrer (ou réenregistrer) votre e-mail, le
   nom de votre site Atlassian et votre jeton.
2. Double-cliquez sur **`Verifier-Jira.cmd`**.

Résultat attendu : « Connexion Jira OK », suivi du nom et de l'e-mail de votre compte, puis la
confirmation que le projet Jira configuré est bien accessible.

Sous macOS, les mêmes vérifications se font dans le Terminal :

```bash
bash scripts/set-jira-credentials.sh
bash scripts/check-jira.sh
```

## Comprendre un message d'erreur

| Message | Cause probable | Action |
|---|---|---|
| **401** | Jeton refusé, révoqué ou copié tronqué | Créez un nouveau jeton sur Atlassian et relancez `Configurer-Jira.cmd` |
| **403** | Droits insuffisants sur le projet | Faites accorder le droit manquant par le propriétaire du projet |
| **400** | Format refusé : type ou priorité de ticket inexistant | Demandez à l'agent la liste des types disponibles, puis revalidez |
| **404** | Projet ou ticket introuvable, ou nom de site incorrect | Vérifiez la clé du projet et le nom du site Atlassian |
| « Identifiants Jira manquants » | Aucun jeton n'a encore été enregistré | Lancez `Configurer-Jira.cmd` |
| « chemin de documentation introuvable » | Le lien ou le fichier de documentation a changé | Donnez le nouveau chemin ou le nouveau lien à l'agent |
| « le fichier .pdf n'est pas lisible en texte » | La documentation est un PDF ou un Word | Donnez un lien lisible (Notion, Confluence, site) ou un export Markdown |

## Questions fréquentes

### « Product Manager — Tickets » n'apparaît pas dans le sélecteur

L'installation n'a pas abouti, ou l'application n'a pas été redémarrée.

1. Quittez complètement DeepSeek Harness, puis rouvrez-le.
2. Si l'agent est toujours absent, refaites l'étape 3 de l'installation : dans une conversation
   **Standard**, demandez « Installe le bundle C:\Users\<votre-nom>\Documents\Agent-ticket ».
3. Vérifiez que le dossier contient bien `package.json` et que vous n'avez pas déplacé le dossier
   depuis l'installation.

### L'agent crée les tickets dans le mauvais projet

Le projet Jira se choisit à la première prise en main (question n° 1). Pour le changer, demandez-le
simplement à l'agent (« change le projet Jira pour … »), ou modifiez le fichier
`C:\Users\<votre-nom>\.dsh\pm-tickets\config.json`.

### L'agent ne connaît pas mon produit

Demandez : « quel est mon contexte produit ? ». Si la réponse indique une configuration absente,
répondez aux questions de réglage ou donnez-lui le lien de votre documentation. Un PDF n'est pas
lisible directement : préférez un lien ou un export Markdown.

### Le ticket n'est pas créé

Vérifiez que vous avez répondu « oui » à la question de création. En cas d'erreur 400, demandez la
liste des types de ticket ; si Jira est indisponible, récupérez le ticket en Markdown dans la
conversation et attendez le retour de la connexion.

### Les outils Jira sont indisponibles

L'agent s'affiche mais ne peut pas parler à Jira : le programme local n'a pas été préparé, ou
DeepSeek Harness n'a pas redémarré depuis l'installation. Quittez et rouvrez l'application. Le
programme doit se trouver dans `C:\Users\<votre-nom>\.dsh\pm-tickets\runtime\mcp\jira-mcp.mjs`.

### Mes exemples de tickets ne sont pas utilisés

Demandez : « quels exemples de tickets lis-tu ? » pour voir les fichiers réellement pris en compte.
Vérifiez que le dossier `C:\Users\<votre-nom>\.dsh\pm-tickets\examples\` contient bien des fichiers
`.md`, et non des PDF ou des fichiers Word.

## À retenir

- 401 = jeton refusé ; 403 = droits insuffisants ; 400 = type ou priorité invalide ; 404 = projet,
  ticket ou site introuvable.
- Un jeton perdu se remplace en une minute ; ne le collez jamais dans la conversation.
- Corrigez la cause avant de relancer : réessayer en boucle ne répare rien.
