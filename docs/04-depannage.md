# Dépannage : prérequis Jira et questions fréquentes

## En une minute

- La plupart des pannes viennent du **prérequis Jira** : le MCP Jira absent, non authentifié, ou un accès refusé.
- Ce prérequis se règle **hors de l'agent**, avec les raccourcis du prérequis décrits ci-dessous (voir aussi « Étape 0 — le prérequis Jira » dans [docs/01](01-decouvrir-et-installer.md)) : l'agent ne configure aucun identifiant.
- Lisez le message d'erreur : il indique presque toujours la cause et l'action à mener.

## Le MCP Jira n'est pas configuré

C'est le cas le plus fréquent, et il n'est pas dans l'agent.

- **Symptôme** : l'agent s'affiche, mais il ne peut pas lire ni créer de ticket. Il écrit « identifiants Jira manquants » ou « les outils Jira sont indisponibles ».
- **Cause** : le prérequis MCP Jira n'a pas été fait sur ce poste, ou son authentification a expiré.
- **Action** : refaites le prérequis Jira avec les raccourcis ci-dessous (installation du MCP, puis enregistrement de votre accès). Rouvrez ensuite DeepSeek Harness.
- **Ce que l'agent ne fera pas** : il ne vous demandera ni site Atlassian, ni e-mail, ni jeton, et n'enregistrera aucun identifiant. Il vous renvoie au prérequis, en une phrase.

Sous Windows, le prérequis fournit deux raccourcis à double-cliquer : `Verifier-Jira.cmd` pour contrôler
la connexion, puis, si besoin, `Configurer-Jira.cmd` pour réenregistrer l'accès. Sous macOS, les
mêmes vérifications se font dans le Terminal :

```bash
bash scripts/check-jira.sh
bash scripts/set-jira-credentials.sh
```

Résultat attendu : « Connexion Jira OK », suivi du nom et de l'e-mail de votre compte.

## Comprendre un message d'erreur

| Message | Cause probable | Action |
|---|---|---|
| **401** | Accès Jira refusé, révoqué ou copié tronqué | Refaites le prérequis Jira avec un accès valide, puis rouvrez DeepSeek Harness |
| **403** | Droits insuffisants sur le projet | Faites accorder le droit manquant par le propriétaire du projet |
| **400** | Format refusé : type ou priorité de ticket inexistant | Demandez à l'agent la liste des types disponibles, puis revalidez |
| **404** | Projet ou ticket introuvable, ou nom de site incorrect | Vérifiez la clé du projet et le site Atlassian dans le prérequis |
| « Identifiants Jira manquants » | Le prérequis Jira n'a pas été fait sur ce poste | Refaites le prérequis Jira (voir « Le MCP Jira n'est pas configuré » ci-dessus), puis rouvrez DeepSeek Harness |
| « chemin de documentation introuvable » | Le lien ou le fichier de documentation a changé | Donnez le nouveau chemin ou le nouveau lien à l'agent |
| « le fichier .pdf n'est pas lisible en texte » | La documentation est un PDF ou un Word | Donnez un lien lisible (Notion, Confluence, site) ou un export Markdown |

## Questions fréquentes

### « Product Manager — Tickets » n'apparaît pas dans le sélecteur

L'installation n'a pas abouti, ou l'application n'a pas été redémarrée.

1. Quittez complètement DeepSeek Harness, puis rouvrez-le.
2. Si l'agent est toujours absent, refaites l'étape 2 de l'installation : dans une conversation
   **Standard**, demandez « Installe le bundle `C:\Users\<votre-nom>\Documents\Agent-ticket` ».
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

### Le ticket est trop long, ou il me semble incomplet

Le budget est de **2 200 caractères** pour la description, logigramme exclu. Au-delà, l'agent coupe
dans les **Notes**, puis le **Hors périmètre**, puis le **Contexte** — jamais dans les critères
d'acceptation, les exigences non fonctionnelles ni les hypothèses.

Si ces sections débordent, c'est le sujet qui est trop large : demandez-lui de découper le ticket en
deux plutôt que de le raccourcir.

### Je veux corriger un ticket déjà créé

C'est voulu : **l'agent ne modifie et ne supprime jamais un ticket existant**. Il vous décrit le
changement en une ou deux phrases et vous donne le lien du ticket (`.../browse/CLÉ`). Ouvrez ce lien
et faites la modification vous-même dans Jira.

Un ticket a été créé par erreur ? L'agent ne le supprime pas non plus : à vous de le supprimer ou de
le fermer dans Jira.

### Les outils Jira sont indisponibles

L'agent s'affiche mais ne peut pas parler à Jira : le prérequis MCP Jira n'est pas installé sur ce
poste, ou DeepSeek Harness n'a pas redémarré depuis. Refaites le prérequis, puis quittez et rouvrez
l'application. Le programme doit se trouver dans
`C:\Users\<votre-nom>\.dsh\pm-tickets\runtime\mcp\jira-mcp.mjs`.

### Le logigramme du ticket apparaît en code brut

C'est attendu : Jira Cloud ne dessine pas les diagrammes Mermaid de lui-même. Le commentaire contient
deux versions — la version texte (au-dessus du source) décrit le même parcours et reste lisible dans
tous les Jira. Pour voir le diagramme en image, installez une application Mermaid depuis le
Marketplace Atlassian (par exemple « Mermaid Diagrams for Jira »), qui détecte les blocs `mermaid`
des commentaires.

### Mes exemples de tickets ne sont pas utilisés

Demandez : « quels exemples de tickets lis-tu ? » pour voir les fichiers réellement pris en compte.
Vérifiez que le dossier `C:\Users\<votre-nom>\.dsh\pm-tickets\examples\` contient bien des fichiers
`.md`, et non des PDF ou des fichiers Word.

## À retenir

- Le prérequis Jira se règle avant l'agent, avec ses raccourcis (voir « Étape 0 — le prérequis Jira ») : l'agent ne configure aucun identifiant.
- 401 = accès refusé ; 403 = droits insuffisants ; 400 = type ou priorité invalide ; 404 = projet,
  ticket ou site introuvable.
- L'agent crée seulement : pour modifier ou supprimer, il fournit le lien et vous le faites dans Jira.
- Corrigez la cause avant de relancer : réessayer en boucle ne répare rien.
