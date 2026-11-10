/**
 * Plugin du preset « Product Manager — Tickets ».
 *
 * Deux responsabilités, toutes deux exécutées au chargement du preset :
 *
 * 1. Préparer le serveur MCP Jira. Le preset déclare un serveur MCP local
 *    (`mcp/jira-mcp.mjs`) lancé par le Node embarqué dans DeepSeek Harness.
 *    Ce fichier ne peut pas être désigné par un chemin fixe dans
 *    `cordis.patch.yml` : selon l'installation, le dossier du bundle se trouve
 *    dans le profil, dans un dossier téléchargé, ou dans un lien symbolique.
 *    On copie donc, au chargement, le serveur et ses exemples dans un
 *    emplacement stable du dossier personnel : `~/.dsh/pm-tickets/runtime/`.
 *    Le patch pointe sur `runtime/mcp/jira-mcp.mjs`, calculé à partir de
 *    `process.env.HOME` (macOS/Linux) ou `process.env.USERPROFILE` (Windows).
 *    Le dossier `runtime/` est distinct de `~/.dsh/pm-tickets/examples/`, qui
 *    reste la bibliothèque personnelle de l'utilisateur.
 *
 * 2. Donner au preset un mode d'exécution utilisable. La configuration d'un
 *    preset ne peut déclarer que son identité et sa liste de plugins, pas un
 *    mode d'exécution. Sans ce plugin, une nouvelle session pm-tickets
 *    hériterait du mode global du déploiement — souvent `read-only` — et les
 *    commandes comme les écritures de fichiers seraient refusées.
 *
 *    À la création d'un agent de ce preset, si le mode effectif de la session
 *    est exactement `read-only`, on enregistre un événement `sandbox/mode` à
 *    `workspace-write` avant le premier tour. L'agent peut alors exécuter des
 *    commandes et écrire dans l'espace de travail de la session (et seulement
 *    là). Le plugin n'élève jamais au-delà de `workspace-write`, ne rétrograde
 *    jamais un mode plus large, et ne touche ni à la politique d'approbation
 *    ni aux sessions déjà commencées.
 *
 * @module pm-ticket-agents
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Mode le plus restrictif, celui que l'on remplace. */
const READ_ONLY = 'read-only'

/** Mode accordé par défaut : écritures limitées à l'espace de travail. */
const WORKSPACE_WRITE = 'workspace-write'

/** Dossier du bundle, quel que soit l'endroit d'où il est chargé. */
const BUNDLE_DIR = path.dirname(fileURLToPath(import.meta.url))

/**
 * Prépare `~/.dsh/pm-tickets/runtime/` : le serveur MCP et les exemples livrés
 * avec le bundle, que le serveur relit à chaque rédaction. Idempotent : le
 * serveur n'est réécrit que s'il manque ou diffère, ce qui met aussi à jour
 * les installations existantes. Le dossier `runtime/` ne contient jamais de
 * données personnelles : la bibliothèque d'exemples de l'utilisateur vit à
 * côté, dans `~/.dsh/pm-tickets/examples/`.
 *
 * Un échec n'est jamais fatal : le preset doit rester utilisable même si le
 * dossier personnel est en lecture seule. Un avertissement sur stderr suffit,
 * et le serveur MCP signalera lui-même son absence.
 */
function prepareRuntime() {
  try {
    const runtimeDir = path.join(os.homedir(), '.dsh', 'pm-tickets', 'runtime')
    const mcpDir = path.join(runtimeDir, 'mcp')
    const target = path.join(mcpDir, 'jira-mcp.mjs')
    const source = path.join(BUNDLE_DIR, 'mcp', 'jira-mcp.mjs')

    const sourceContent = fs.readFileSync(source)
    let upToDate = false
    try {
      upToDate = fs.readFileSync(target).equals(sourceContent)
    } catch {
      upToDate = false
    }
    if (!upToDate) {
      fs.mkdirSync(mcpDir, { recursive: true, mode: 0o700 })
      // Écriture atomique : un fichier partiel ne doit jamais être exécuté.
      const temporary = `${target}.${process.pid}.tmp`
      fs.writeFileSync(temporary, sourceContent, { mode: 0o600 })
      fs.renameSync(temporary, target)
    }

    // Les exemples livrés sont recopiés à chaque version : le dossier
    // `runtime/examples` est entièrement géré par le bundle, contrairement au
    // dossier utilisateur `pm-tickets/examples`.
    const examplesTarget = path.join(runtimeDir, 'examples')
    const examplesSource = path.join(BUNDLE_DIR, 'examples')
    if (fs.existsSync(examplesSource)) {
      fs.rmSync(examplesTarget, { recursive: true, force: true })
      fs.cpSync(examplesSource, examplesTarget, { recursive: true })
    }
  } catch (error) {
    process.stderr.write(
      `[pm-tickets] serveur MCP non préparé (${error instanceof Error ? error.message : String(error)})\n`,
    )
  }
}

// Exécuté à l'import du module : avant que le serveur MCP du preset ne soit
// lancé, quel que soit l'ordre de montage des plugins du preset.
prepareRuntime()

/**
 * Installe le listener de création d'agent.
 *
 * `agent/created` est dispatché en série pendant la création : une exception
 * qui s'en échappe fait échouer la création de la session. Tout le corps du
 * listener est donc protégé, et un échec est seulement journalisé.
 *
 * @param ctx le contexte Cordis du preset.
 * @returns le désabonnement, pour que Cordis nettoie au déchargement.
 */
export function apply(ctx) {
  return ctx.on('agent/created', ({ agent }) => {
    try {
      // (a) Sans l'un des deux services, on ne peut ni lire l'historique de la
      // session ni son mode effectif : on ne touche à rien.
      const agents = ctx.get('agents')
      const sandboxPolicy = ctx.get('sandboxPolicy')
      if (agents === undefined || sandboxPolicy === undefined) return

      // (b) Une session qui a déjà vécu (reprise) conserve le mode de son
      // journal. Un état de projection illisible est traité comme inconnu :
      // dans le doute, on ne modifie rien.
      const boundary = agents.turnBoundaryOf(agent.session)
      if (boundary === undefined || boundary.lastTurn > 0) return

      // (c) Mode effectif : dernier `sandbox/mode` enregistré, sinon le défaut
      // du déploiement. La politique d'approbation n'entre pas en compte ici.
      const { mode } = sandboxPolicy.resolve({ session: agent.session })

      // (d) Seul `read-only` est remplacé, et une seule fois : l'événement est
      // la seule écriture, il sera relu au prochain démarrage.
      if (mode !== READ_ONLY) return
      agent.session.append('sandbox/mode', { mode: WORKSPACE_WRITE })
    } catch (error) {
      // (e) Un listener `agent/created` ne doit jamais faire échouer la
      // création de l'agent : on se contente d'un avertissement.
      ctx.logger?.warn(
        `pm-tickets : mode d'exécution par défaut non appliqué (${String(error)})`,
      )
    }
  })
}
