#!/usr/bin/env node
/**
 * Minimal Jira MCP server (stdio, JSON-RPC) for the « Product Manager — Tickets » agent.
 *
 * Tools:
 *   - jira_search        : JQL search
 *   - jira_get_issue     : read one issue
 *   - jira_create_issue  : create an issue from Markdown (converted to ADF)
 *   - jira_add_comment   : comment an issue from Markdown
 *   - jira_create_meta   : list issue types / required fields of a project
 *   - jira_projects      : list the Jira projects reachable with the credentials
 *   - ticket_examples    : reference tickets the agent must imitate (nomenclature)
 *   - setup_read         : current configuration (Jira project, docs, repo, examples)
 *   - setup_save         : persist the guided-setup answers (Jira project included)
 *   - product_context    : documentation + GitHub repository content for context
 *
 * Credentials come from the process environment:
 *   ATLASSIAN_SITE_NAME, ATLASSIAN_USER_EMAIL, ATLASSIAN_API_TOKEN
 * (optionally ATLASSIAN_BASE_URL to override https://<site>.atlassian.net)
 *
 * The server never writes to disk: logs go to stderr, protocol to stdout.
 */

import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { URL, fileURLToPath } from 'node:url';

const SERVER_INFO = { name: 'jira-pm-tickets', version: '1.0.0' };
const BUNDLE_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONFIG_DIR = path.join(os.homedir(), '.dsh', 'pm-tickets');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const log = (...args) => process.stderr.write(`[jira-mcp] ${args.join(' ')}\n`);

/* ------------------------------------------------------------------ config */

/**
 * Reads `~/.dsh/jira/credentials.env` as a fallback, so credentials created
 * after this process started are picked up without restarting the session.
 */
function credentialsFromFile() {
  const file =
    process.env.JIRA_CREDENTIALS_FILE || path.join(os.homedir(), '.dsh', 'jira', 'credentials.env');
  const values = {};
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    return values;
  }
  for (const line of content.split('\n')) {
    const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function config() {
  const file = credentialsFromFile();
  const site = process.env.ATLASSIAN_SITE_NAME || file.ATLASSIAN_SITE_NAME;
  const email = process.env.ATLASSIAN_USER_EMAIL || file.ATLASSIAN_USER_EMAIL;
  const token = process.env.ATLASSIAN_API_TOKEN || file.ATLASSIAN_API_TOKEN;
  const explicitBase = process.env.ATLASSIAN_BASE_URL || file.ATLASSIAN_BASE_URL;
  const base =
    explicitBase ||
    (site ? `https://${String(site).replace(/\.atlassian\.net.*$/, '')}.atlassian.net` : undefined);
  return { site, email, token, base };
}

function requireConfig() {
  const c = config();
  const missing = [];
  if (!c.base) missing.push('ATLASSIAN_SITE_NAME (ou ATLASSIAN_BASE_URL)');
  if (!c.email) missing.push('ATLASSIAN_USER_EMAIL');
  if (!c.token) missing.push('ATLASSIAN_API_TOKEN');
  if (missing.length) {
    throw new Error(
      `Identifiants Jira manquants : ${missing.join(', ')}. ` +
        'Lancez Configurer-Jira.cmd (Windows) ou scripts/set-jira-credentials.sh (macOS), puis réessayez (aucun redémarrage nécessaire).',
    );
  }
  return c;
}

/* ----------------------------------------------------------- configuration */

function readConfig() {
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function pruneEmpty(value) {
  if (!value || typeof value !== 'object') return value;
  const next = Array.isArray(value) ? [...value] : { ...value };
  for (const [key, item] of Object.entries(next)) {
    if (item && typeof item === 'object') {
      next[key] = pruneEmpty(item);
      if (!Array.isArray(next[key]) && next[key] && Object.keys(next[key]).length === 0) delete next[key];
    } else if (item === '' || item === null || item === undefined) {
      delete next[key];
    }
  }
  return next;
}

function writeConfig(patch) {
  const current = readConfig();
  const merged = {
    ...current,
    ...patch,
    docs: { ...(current.docs || {}), ...(patch.docs || {}) },
    repo: { ...(current.repo || {}), ...(patch.repo || {}) },
    jira: { ...(current.jira || {}), ...(patch.jira || {}) },
  };
  const next = pruneEmpty(merged);
  next.updatedAt = new Date().toISOString();
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const tmp = `${CONFIG_FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, CONFIG_FILE);
  return next;
}

const SETUP_QUESTIONS = {
  project: {
    question: 'Dans quel projet Jira dois-je créer vos tickets ?',
    detail:
      'La clé du projet (ex. BOUTIQUE), son nom ou l\u2019URL d\u2019un ticket ou du projet suffit. Si vous ne la connaissez pas, je peux lister vos projets accessibles. Répondez « je ne sais pas encore » si vous préférez choisir au moment de créer le premier ticket.',
  },
  examples: {
    question: 'Où sont vos tickets types ?',
    detail:
      "Vous pouvez me donner le dossier ou les fichiers Markdown qui contiennent vos tickets habituels, ou répondre « je n'en ai pas ». Ces exemples m'apprennent votre nomenclature : ordre des sections, vocabulaire, format des critères.",
  },
  docs: {
    question: 'Avez-vous de la documentation produit ?',
    detail:
      'Un lien suffit : Notion, Confluence, un site, un Google Doc partagé, ou le chemin d’un fichier ou dossier Markdown sur votre ordinateur. Cela m’évite d’inventer le vocabulaire et les règles métier. Répondez « pas de documentation » si vous n’en avez pas.',
  },
  repo: {
    question: 'Où vit le code, sur GitHub ?',
    detail:
      'Collez l’URL du dépôt, ou sa forme courte organisation/dépôt. Cela me permet de situer chaque ticket dans le bon module. Répondez « pas de dépôt » si le code n’est pas sur GitHub.',
  },
};

function setupState() {
  const cfg = readConfig();
  const examples = readExamples();
  const credsFile = path.join(os.homedir(), '.dsh', 'jira', 'credentials.env');
  const docs = cfg.docs || {};
  const repo = cfg.repo || {};
  const jira = cfg.jira || {};

  // Each onboarding topic counts as answered when it has a value or an
  // explicit refusal — a successful save never counts as completion. The
  // Jira project comes first: it is the target of every created ticket.
  const answered = {
    project: Boolean(jira.key || jira.skipped),
    examples: Boolean(cfg.examplesDir || cfg.examplesSkipped),
    docs: Boolean(docs.url || docs.path || docs.skipped),
    repo: Boolean(repo.url || repo.skipped),
  };
  const missing = ['project', 'examples', 'docs', 'repo'].filter((topic) => !answered[topic]);
  const nextQuestion = missing[0] || null;

  return {
    configured: Boolean(cfg.updatedAt),
    onboardingComplete: missing.length === 0,
    missing,
    nextQuestion,
    suggestedQuestion: nextQuestion ? SETUP_QUESTIONS[nextQuestion] : null,
    answered,
    productName: cfg.productName || null,
    jiraProject: jira.key ? { key: jira.key, name: jira.name || null } : null,
    jiraProjectSkipped: Boolean(jira.skipped),
    docs,
    repo,
    examplesDir: cfg.examplesDir || null,
    examplesSkipped: Boolean(cfg.examplesSkipped),
    notes: cfg.notes || null,
    jiraCredentialsFound: fs.existsSync(credsFile),
    exampleCount: examples.length,
    exampleNames: examples.map((example) => example.name),
    updatedAt: cfg.updatedAt || null,
  };
}

/* ---------------------------------------------------------------- examples */

/**
 * Reference tickets used as the house nomenclature. Sanctioned directories,
 * in priority order: an explicit override, the team library under the user's
 * DSH home, then the samples shipped with this bundle.
 */
function exampleDirs() {
  const dirs = [];
  if (process.env.PM_TICKETS_EXAMPLES_DIR) dirs.push(process.env.PM_TICKETS_EXAMPLES_DIR);
  const configured = readConfig().examplesDir;
  if (configured) dirs.push(String(configured));
  dirs.push(path.join(os.homedir(), '.dsh', 'pm-tickets', 'examples'));
  dirs.push(path.join(BUNDLE_DIR, 'examples'));
  return dirs;
}

function readExamples() {
  const found = new Map();
  for (const dir of exampleDirs()) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isFile()) continue;
      if (!/\.(md|markdown|txt)$/i.test(entry.name)) continue;
      // Meta documents describe the library; they are not tickets to imitate.
      if (/^[_.]/.test(entry.name)) continue;
      if (/^(readme|nomenclature|index)\.(md|markdown|txt)$/i.test(entry.name)) continue;
      if (found.has(entry.name)) continue;
      try {
        found.set(entry.name, {
          name: entry.name,
          source: dir,
          content: fs.readFileSync(path.join(dir, entry.name), 'utf8'),
        });
      } catch {
        /* unreadable file: skip */
      }
    }
  }
  return [...found.values()];
}

const MAX_EXAMPLE_CHARS = 40000;

async function ticketExamples({ name, maxChars = MAX_EXAMPLE_CHARS } = {}) {
  const all = readExamples();
  if (!all.length) {
    return text(
      'Aucun exemple de ticket disponible. Applique le gabarit par défaut. ' +
        "L'utilisateur peut ajouter des exemples dans ~/.dsh/pm-tickets/examples/.",
    );
  }

  const wanted = name ? String(name).toLowerCase() : null;
  const selected = wanted
    ? all.filter((example) => example.name.toLowerCase().includes(wanted))
    : all;

  if (!selected.length) {
    return text(
      `Aucun exemple ne correspond à « ${name} ». Exemples disponibles : ` +
        all.map((example) => example.name).join(', '),
    );
  }

  const budget = Math.max(2000, Math.min(Number(maxChars) || MAX_EXAMPLE_CHARS, 200000));
  let used = 0;
  const blocks = [];
  for (const example of selected) {
    const header = `### ${example.name}\n\n`;
    const remaining = budget - used - header.length;
    if (remaining <= 200) {
      blocks.push(`### ${example.name}\n\n(exemple omis : budget de lecture atteint)`);
      continue;
    }
    const body = example.content.trim();
    const clipped = body.length > remaining ? `${body.slice(0, remaining)}\n\n[…tronqué]` : body;
    used += header.length + clipped.length;
    blocks.push(header + clipped);
  }

  return text(
    `Exemples de référence (${selected.length}) — imite leur nomenclature, ne recopie pas leur contenu :\n\n` +
      blocks.join('\n\n---\n\n'),
  );
}

/* --------------------------------------------------------- product context */

const CACHE_TTL_MS = 10 * 60 * 1000;
const contextCache = new Map();

async function cachedValue(key, loader) {
  const hit = contextCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  const value = await loader();
  contextCache.set(key, { at: Date.now(), value });
  return value;
}

const ENTITIES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

function stripHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function clip(text, cap) {
  const value = String(text ?? '').trim();
  if (value.length <= cap) return value;
  return `${value.slice(0, cap)}\n\n[…tronqué à ${cap} caractères]`;
}

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'dsh-pm-tickets/1.2 (+local agent)' },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  const type = res.headers.get('content-type') || '';
  const body = await res.text();
  return /html/i.test(type) ? stripHtml(body) : body;
}

async function loadDocs(cfg) {
  const docs = cfg.docs || {};
  if (docs.path) {
    const target = path.resolve(String(docs.path));
    let stat;
    try {
      stat = fs.statSync(target);
    } catch {
      throw new Error(`chemin de documentation introuvable : ${target}`);
    }
    if (stat.isDirectory()) {
      const files = fs
        .readdirSync(target, { withFileTypes: true })
        .filter((entry) => entry.isFile() && /\.(md|mdx|txt)$/i.test(entry.name))
        .map((entry) => entry.name)
        .sort();
      if (!files.length) throw new Error(`aucun fichier .md dans ${target}`);
      return {
        source: target,
        text: files
          .map((name) => `### ${name}\n\n${fs.readFileSync(path.join(target, name), 'utf8').trim()}`)
          .join('\n\n---\n\n'),
      };
    }

    const extension = path.extname(target).toLowerCase();
    if (/\.(pdf|docx?|xlsx?|pptx?|odt|ods|zip|png|jpe?g|gif|webp)$/i.test(extension)) {
      throw new Error(
        `le fichier ${extension} n'est pas lisible en texte. Exportez la documentation en Markdown ou en texte, ` +
          'ou donnez plutôt un lien http(s) (Notion, Confluence, site).',
      );
    }

    const raw = fs.readFileSync(target);
    if (raw.includes(0)) {
      throw new Error(
        `le fichier ${target} semble binaire, pas du texte. Donnez un lien http(s) ou un fichier Markdown/texte.`,
      );
    }
    return { source: target, text: raw.toString('utf8') };
  }
  if (docs.url) {
    const text = await cachedValue(`docs:${docs.url}`, () => fetchText(String(docs.url)));
    return { source: String(docs.url), text };
  }
  throw new Error("aucune documentation produit configurée (docs.url ou docs.path)");
}

function parseGitHubRepo(url) {
  const match = /github\.com[/:]([^/\s]+)\/([^/#?\s]+?)(?:\.git)?(?:[/#?].*)?$/i.exec(String(url).trim());
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

async function loadRepo(cfg) {
  const repo = cfg.repo || {};
  if (!repo.url) throw new Error('aucun dépôt GitHub configuré (repo.url)');
  const parsed = parseGitHubRepo(repo.url);
  if (!parsed) throw new Error(`URL GitHub non reconnue : ${repo.url}`);

  const token = process.env.GITHUB_TOKEN || '';
  const baseHeaders = { Accept: 'application/vnd.github+json', 'User-Agent': 'dsh-pm-tickets' };
  if (token) baseHeaders.Authorization = `Bearer ${token}`;
  const api = (suffix) => `https://api.github.com/repos/${parsed.owner}/${parsed.repo}${suffix}`;
  const slug = `${parsed.owner}/${parsed.repo}`;

  const meta = await cachedValue(`repo:meta:${slug}`, async () => {
    const res = await fetch(api(''), { headers: baseHeaders, signal: AbortSignal.timeout(20000) });
    if (res.status === 404) throw new Error(`dépôt introuvable ou privé : ${slug}`);
    if (res.status === 403) throw new Error('quota GitHub atteint (60 requêtes/heure sans token) ; définissez GITHUB_TOKEN');
    if (!res.ok) throw new Error(`GitHub a répondu ${res.status} pour ${slug}`);
    return await res.json();
  });

  const readme = await cachedValue(`repo:readme:${slug}`, async () => {
    const res = await fetch(api('/readme'), {
      headers: { ...baseHeaders, Accept: 'application/vnd.github.raw' },
      signal: AbortSignal.timeout(20000),
    });
    return res.ok ? await res.text() : '(README indisponible)';
  });

  const rootFiles = await cachedValue(`repo:root:${slug}`, async () => {
    const res = await fetch(api('/contents/'), {
      headers: baseHeaders,
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return [];
    const list = await res.json();
    return Array.isArray(list)
      ? list.map((entry) => `${entry.type === 'dir' ? '📁' : '📄'} ${entry.name}`)
      : [];
  });

  const lines = [
    `- dépôt : ${slug}`,
    `- description : ${meta.description || '(aucune)'}`,
    `- langage principal : ${meta.language || '(inconnu)'}`,
    `- branche par défaut : ${meta.default_branch || '(inconnue)'}`,
    meta.topics?.length ? `- sujets : ${meta.topics.join(', ')}` : null,
    repo.ref ? `- référence consultée : ${repo.ref}` : null,
    rootFiles.length ? `\n### Racine du dépôt\n\n${rootFiles.join('\n')}` : null,
    `\n### README\n\n${readme}`,
  ].filter(Boolean);

  return { source: `https://github.com/${slug}`, text: lines.join('\n') };
}

async function productContext({ part = 'all', maxChars = 24000 } = {}) {
  const cfg = readConfig();
  const budget = Math.max(2000, Math.min(Number(maxChars) || 24000, 120000));
  const wanted = String(part || 'all').toLowerCase();
  const blocks = [];

  if (wanted === 'all' || wanted === 'docs') {
    try {
      const docs = await loadDocs(cfg);
      blocks.push(`## Documentation produit\n\nSource : ${docs.source}\n\n${clip(docs.text, Math.round(budget * 0.5))}`);
    } catch (error) {
      blocks.push(`## Documentation produit\n\n⚠️ Indisponible : ${error.message}`);
    }
  }

  if (wanted === 'all' || wanted === 'repo') {
    try {
      const repo = await loadRepo(cfg);
      blocks.push(`## Dépôt GitHub\n\n${clip(repo.text, Math.round(budget * 0.5))}`);
    } catch (error) {
      blocks.push(`## Dépôt GitHub\n\n⚠️ Indisponible : ${error.message}`);
    }
  }

  if (!blocks.length) return text('Aucune source demandée. Utilise part: "docs", "repo" ou "all".');
  return text(blocks.join('\n\n---\n\n'));
}

/* -------------------------------------------------------------- HTTP layer */

function request(method, path, body) {
  const c = requireConfig();
  const url = new URL(path.startsWith('http') ? path : c.base + path);
  const auth = Buffer.from(`${c.email}:${c.token}`).toString('base64');
  const payload = body === undefined ? undefined : Buffer.from(JSON.stringify(body), 'utf8');

  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: 'application/json',
  };
  if (payload) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = String(payload.length);
  }

  const transport = url.protocol === 'http:' ? http : https;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      url,
      { method, headers, timeout: 60000 },
      (res) => {
        const chunks = [];
        res.on('data', (ch) => chunks.push(ch));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let parsed;
          try {
            parsed = text ? JSON.parse(text) : {};
          } catch {
            parsed = { raw: text };
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const detail =
              (parsed && (parsed.errorMessages?.join(' · ') || parsed.message)) ||
              (parsed && parsed.errors ? JSON.stringify(parsed.errors) : '') ||
              text.slice(0, 500);
            reject(new Error(`Jira ${res.statusCode} sur ${method} ${url.pathname} : ${detail}`));
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('Délai dépassé en appelant Jira')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/* --------------------------------------------------------- Markdown to ADF */

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function inlineNodes(text) {
  const nodes = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) nodes.push({ type: 'text', text: text.slice(last, match.index) });
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push({ type: 'text', text: token.slice(2, -2), marks: [{ type: 'strong' }] });
    } else if (token.startsWith('`')) {
      nodes.push({ type: 'text', text: token.slice(1, -1), marks: [{ type: 'code' }] });
    } else {
      const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      nodes.push({
        type: 'text',
        text: m[1],
        marks: [{ type: 'link', attrs: { href: m[2] } }],
      });
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push({ type: 'text', text: text.slice(last) });
  return nodes.filter((n) => n.text !== '');
}

const paragraph = (text) => {
  const content = inlineNodes(text);
  return content.length ? { type: 'paragraph', content } : null;
};

export function markdownToAdf(markdown) {
  const lines = String(markdown ?? '').replace(/\r\n/g, '\n').split('\n');
  const content = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const buf = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1;
      content.push({
        type: 'codeBlock',
        ...(language ? { attrs: { language } } : {}),
        content: buf.length ? [{ type: 'text', text: buf.join('\n') }] : [],
      });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const node = paragraph(heading[2].trim());
      content.push({
        type: 'heading',
        attrs: { level: Math.min(heading[1].length, 6) },
        content: node ? node.content : [],
      });
      i += 1;
      continue;
    }

    const bullet = /^[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      const items = [];
      while (i < lines.length) {
        const m = /^[-*+]\s+(.*)$/.exec(lines[i]);
        if (!m) break;
        const p = paragraph(m[1].trim());
        items.push({ type: 'listItem', content: p ? [p] : [] });
        i += 1;
      }
      content.push({ type: 'bulletList', content: items });
      continue;
    }

    const ordered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (ordered) {
      const items = [];
      while (i < lines.length) {
        const m = /^\d+[.)]\s+(.*)$/.exec(lines[i]);
        if (!m) break;
        const p = paragraph(m[1].trim());
        items.push({ type: 'listItem', content: p ? [p] : [] });
        i += 1;
      }
      content.push({ type: 'orderedList', content: items });
      continue;
    }

    if (line.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      const inner = markdownToAdf(buf.join('\n'));
      content.push({ type: 'blockquote', content: inner.content });
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      content.push({ type: 'rule' });
      i += 1;
      continue;
    }

    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^[-*+]\s+/.test(lines[i]) &&
      !/^\d+[.)]\s+/.test(lines[i]) &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('>')
    ) {
      buf.push(lines[i]);
      i += 1;
    }
    const p = paragraph(buf.join(' ').trim());
    if (p) content.push(p);
  }

  if (!content.length) content.push({ type: 'paragraph', content: [{ type: 'text', text: ' ' }] });
  return { type: 'doc', version: 1, content };
}

/* ------------------------------------------------------------------- tools */

const TOOLS = [
  {
    name: 'jira_search',
    description:
      'Recherche des tickets Jira avec une requête JQL. Utile pour détecter les doublons et les conventions du projet avant de créer un ticket.',
    inputSchema: {
      type: 'object',
      properties: {
        jql: { type: 'string', description: 'Requête JQL, par exemple: project = CLÉPROJET AND text ~ "connexion"' },
        maxResults: { type: 'number', description: 'Nombre maximum de résultats (défaut 10, maximum 50).' },
        fields: { type: 'string', description: 'Liste de champs séparés par des virgules (défaut: summary,status,issuetype,priority).' },
      },
      required: ['jql'],
      additionalProperties: false,
    },
  },
  {
    name: 'jira_get_issue',
    description: "Lit un ticket Jira existant : résumé, description, statut, type, priorité, libellés, assigné et lien.",
    inputSchema: {
      type: 'object',
      properties: { key: { type: 'string', description: 'Clé du ticket, par exemple CLÉPROJET-12.' } },
      required: ['key'],
      additionalProperties: false,
    },
  },
  {
    name: 'jira_create_issue',
    description:
      'Crée un ticket Jira. La description est écrite en Markdown et convertie automatiquement au format Atlassian (ADF).',
    inputSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Résumé du ticket, une phrase, 120 caractères maximum.' },
        description: { type: 'string', description: 'Description complète en Markdown (titres ##, listes -, gras **, blocs de code).' },
        issueType: { type: 'string', description: 'Type de ticket, par exemple Story, Task, Bug (défaut: Story).' },
        projectKey: { type: 'string', description: 'Clé du projet (défaut : le projet configuré en mise en route).' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Libellés à appliquer.' },
        priority: { type: 'string', description: 'Priorité Jira, par exemple Highest, High, Medium, Low, Lowest.' },
      },
      required: ['summary', 'description'],
      additionalProperties: false,
    },
  },
  {
    name: 'jira_add_comment',
    description: "Ajoute un commentaire (Markdown converti en ADF) à un ticket existant.",
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Clé du ticket, par exemple CLÉPROJET-12.' },
        comment: { type: 'string', description: 'Commentaire en Markdown.' },
      },
      required: ['key', 'comment'],
      additionalProperties: false,
    },
  },
  {
    name: 'jira_create_meta',
    description:
      "Liste les types de ticket disponibles dans un projet et leurs champs requis, pour savoir quoi remplir avant de créer un ticket.",
    inputSchema: {
      type: 'object',
      properties: { projectKey: { type: 'string', description: 'Clé du projet (défaut : le projet configuré en mise en route).' } },
      additionalProperties: false,
    },
  },
  {
    name: 'jira_projects',
    description:
      "Liste les projets Jira accessibles avec les identifiants enregistrés, pour proposer le bon projet quand la personne ne connaît pas sa clé ou hésite.",
    inputSchema: {
      type: 'object',
      properties: {
        maxResults: { type: 'number', description: 'Nombre maximum de projets (défaut 50, maximum 50).' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'ticket_examples',
    description:
      "Renvoie les tickets de référence (nomenclature maison) que l'agent doit imiter : ordre et intitulés des sections, vocabulaire, format des critères d'acceptation, niveau de détail. À appeler avant de rédiger un ticket.",
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: "Filtre optionnel sur le nom du fichier (ex. « bug » ou « story »). Sans filtre, renvoie tous les exemples.",
        },
        maxChars: {
          type: 'number',
          description: 'Budget de lecture en caractères (défaut 40000).',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'setup_read',
    description:
      "État de la configuration et de la mise en route. `missing` liste les questions encore sans réponse parmi projet Jira, tickets d'exemple, documentation et dépôt ; `nextQuestion` et `suggestedQuestion` donnent la question à poser maintenant. `jiraProject` donne le projet cible configuré. À appeler au début d'une conversation.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'setup_save',
    description:
      "Enregistre une réponse aux quatre questions de mise en route (projet Jira, tickets d'exemple, documentation, dépôt) ou met à jour la configuration produit. Enregistrer ne termine pas la mise en route : lire `missing` et `nextQuestion` dans le résultat pour savoir quoi demander ensuite. Utiliser skipProject / skipExamples / skipDocs / skipRepo quand la personne répond qu'elle n'a pas l'élément ou ne sait pas encore.",
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string', description: 'Clé du projet Jira cible (ex. BOUTIQUE) ; une URL de projet ou de ticket Jira suffit, la clé en est extraite.' },
        projectName: { type: 'string', description: 'Nom lisible du projet Jira, si connu.' },
        skipProject: { type: 'boolean', description: "Vrai si le projet sera choisi plus tard, au moment de créer le premier ticket." },
        productName: { type: 'string', description: 'Nom du produit ou de la fonctionnalité.' },
        docsUrl: { type: 'string', description: 'Lien http(s) vers la documentation produit (Notion, Confluence, site, Google Doc public…).' },
        docsPath: { type: 'string', description: 'Chemin local d’un fichier Markdown ou d’un dossier de documentation.' },
        repoUrl: { type: 'string', description: 'URL du dépôt GitHub, par exemple https://github.com/org/repo.' },
        repoRef: { type: 'string', description: 'Branche ou tag à privilégier (information).' },
        examplesDir: { type: 'string', description: 'Dossier contenant les tickets d’exemple.' },
        notes: { type: 'string', description: 'Vocabulaire, contraintes ou préférences à retenir (texte libre).' },
        skipExamples: { type: 'boolean', description: "Vrai si la personne n'a pas de tickets d'exemple à fournir." },
        skipDocs: { type: 'boolean', description: "Vrai si la personne n'a pas de documentation produit." },
        skipRepo: { type: 'boolean', description: "Vrai si le code n'est pas sur GitHub ou n'est pas accessible." },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'product_context',
    description:
      "Renvoie le contexte produit utile à la rédaction d'un ticket : documentation configurée et contenu du dépôt GitHub (description, arborescence racine, README).",
    inputSchema: {
      type: 'object',
      properties: {
        part: { type: 'string', enum: ['all', 'docs', 'repo'], description: 'Source à lire (défaut : all).' },
        maxChars: { type: 'number', description: 'Budget de lecture en caractères (défaut 24000).' },
      },
      additionalProperties: false,
    },
  },
];

const text = (value) => ({
  content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
});
const failure = (message) => ({ content: [{ type: 'text', text: message }], isError: true });

const browseUrl = (key) => `${config().base}/browse/${key}`;

/**
 * Projet cible de la création : la clé explicite de l'appel, sinon le projet
 * enregistré pendant la mise en route. Aucun projet n'est jamais supposé :
 * sans clé configurée, on s'arrête avec une consigne claire plutôt que de
 * créer un ticket au mauvais endroit.
 */
function resolveProjectKey(explicit) {
  const value = String(explicit || '').trim();
  if (value) return value.toUpperCase();
  const saved = readConfig().jira?.key;
  if (saved) return String(saved).toUpperCase();
  throw new Error(
    "Aucun projet Jira n'est configuré. Demandez à votre interlocuteur de choisir le projet cible " +
      '(ou listez-les avec jira_projects), enregistrez-le avec setup_save, puis réessayez.',
  );
}

async function searchIssues({ jql, maxResults = 10, fields = 'summary,status,issuetype,priority' }) {
  const limit = Math.max(1, Math.min(Number(maxResults) || 10, 50));
  const path =
    `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}` +
    `&maxResults=${limit}&fields=${encodeURIComponent(fields)}`;
  try {
    const data = await request('GET', path);
    const issues = (data.issues || []).map((issue) => ({
      key: issue.key,
      summary: issue.fields?.summary,
      type: issue.fields?.issuetype?.name,
      status: issue.fields?.status?.name,
      priority: issue.fields?.priority?.name,
      url: browseUrl(issue.key),
    }));
    return text({ total: data.total ?? issues.length, issues });
  } catch (error) {
    // Older deployments only expose the legacy search endpoint.
    if (/Jira 4\d\d/.test(error.message)) {
      const legacy =
        `/rest/api/3/search?jql=${encodeURIComponent(jql)}` +
        `&maxResults=${limit}&fields=${encodeURIComponent(fields)}`;
      const data = await request('GET', legacy);
      const issues = (data.issues || []).map((issue) => ({
        key: issue.key,
        summary: issue.fields?.summary,
        type: issue.fields?.issuetype?.name,
        status: issue.fields?.status?.name,
        priority: issue.fields?.priority?.name,
        url: browseUrl(issue.key),
      }));
      return text({ total: data.total ?? issues.length, issues });
    }
    throw error;
  }
}

async function getIssue({ key }) {
  const data = await request(
    'GET',
    `/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,description,status,issuetype,priority,labels,assignee,created,updated`,
  );
  return text({
    key: data.key,
    summary: data.fields?.summary,
    type: data.fields?.issuetype?.name,
    status: data.fields?.status?.name,
    priority: data.fields?.priority?.name,
    labels: data.fields?.labels ?? [],
    assignee: data.fields?.assignee?.displayName ?? null,
    created: data.fields?.created,
    updated: data.fields?.updated,
    descriptionAdf: data.fields?.description ?? null,
    url: browseUrl(data.key),
  });
}

async function createIssue({ summary, description, issueType = 'Story', projectKey, labels, priority }) {
  const key = resolveProjectKey(projectKey);
  const fields = {
    project: { key },
    issuetype: { name: issueType },
    summary,
    description: markdownToAdf(description),
  };
  if (Array.isArray(labels) && labels.length) fields.labels = labels;
  if (priority) fields.priority = { name: priority };

  const data = await request('POST', '/rest/api/3/issue', { fields });
  return text({
    created: true,
    key: data.key,
    id: data.id,
    url: browseUrl(data.key),
    summary,
    issueType,
    projectKey: key,
  });
}

async function addComment({ key, comment }) {
  const data = await request('POST', `/rest/api/3/issue/${encodeURIComponent(key)}/comment`, {
    body: markdownToAdf(comment),
  });
  return text({ added: true, issue: key, commentId: data.id, url: `${browseUrl(key)}?focusedCommentId=${data.id}` });
}

async function createMeta({ projectKey } = {}) {
  const key = resolveProjectKey(projectKey);
  try {
    const data = await request('GET', `/rest/api/3/issue/createmeta/${encodeURIComponent(key)}/issuetypes`);
    const types = (data.issueTypes || data.values || []).map((t) => ({ id: t.id, name: t.name, subtask: t.subtask }));
    return text({ projectKey: key, issueTypes: types });
  } catch (error) {
    if (!/Jira 4\d\d/.test(error.message)) throw error;
    const data = await request(
      'GET',
      `/rest/api/3/issue/createmeta?projectKeys=${encodeURIComponent(key)}&expand=projects.issuetypes`,
    );
    const project = (data.projects || []).find((candidate) => candidate.key === key) || (data.projects || [])[0];
    const types = (project?.issuetypes || []).map((t) => ({ id: t.id, name: t.name, subtask: t.subtask }));
    return text({ projectKey: key, issueTypes: types });
  }
}

async function listProjects({ maxResults = 50 } = {}) {
  const limit = Math.max(1, Math.min(Number(maxResults) || 50, 50));
  const data = await request('GET', `/rest/api/3/project/search?maxResults=${limit}&orderBy=key`);
  const projects = (data.values || []).map((project) => ({ key: project.key, name: project.name }));
  return text({ total: data.total ?? projects.length, projects });
}

/* ------------------------------------------------------------- setup tools */

async function setupRead() {
  return text(setupState());
}

async function setupSave(args = {}) {
  const patch = {};
  const assign = (key, value) => {
    if (value !== undefined) patch[key] = String(value).trim();
  };
  assign('productName', args.productName);
  assign('notes', args.notes);

  // --- Jira project -----------------------------------------------------
  let projectResult = {};
  if (args.projectKey !== undefined || args.projectName !== undefined || args.skipProject) {
    const jira = {};
    if (args.projectKey !== undefined) {
      const raw = String(args.projectKey).trim();
      const fromUrl =
        /\/(?:projects|browse)\/([A-Za-z0-9]+)/.exec(raw)?.[1] ||
        /\/([A-Za-z0-9]+)-\d+/.exec(raw)?.[1] ||
        null;
      const key = (fromUrl || raw).toUpperCase();
      if (!/^[A-Z][A-Z0-9]+$/.test(key)) {
        throw new Error(
          `"${raw}" n'est pas une clé de projet Jira valide. ` +
            'Donnez la clé (ex. BOUTIQUE) ou l\u2019URL d\u2019un ticket ou du projet ; ' +
            'si seul le nom est connu, listez les projets avec jira_projects pour retrouver la clé.',
        );
      }
      jira.key = key;
      jira.skipped = undefined;
    }
    if (args.projectName !== undefined) jira.name = String(args.projectName).trim();
    if (args.skipProject) jira.skipped = true;
    if (jira.key) jira.skipped = undefined;
    if (Object.keys(jira).length) patch.jira = jira;
  }

  // Best-effort validation: reach Jira when credentials are available and
  // canonicalize the project name. A failed check never blocks the save.
  if (patch.jira?.key) {
    try {
      const c = config();
      if (c.base && c.email && c.token) {
        const data = await request('GET', `/rest/api/3/project/${encodeURIComponent(patch.jira.key)}`);
        if (data?.key) {
          patch.jira.key = data.key;
          if (data.name) patch.jira.name = data.name;
          projectResult = { projectValidated: true, projectName: data.name };
        }
      } else {
        projectResult = {
          projectValidated: false,
          projectWarning: 'Projet enregistré mais non vérifié : identifiants Jira absents.',
        };
      }
    } catch (error) {
      projectResult = {
        projectValidated: false,
        projectWarning: `Projet enregistré mais non vérifié : ${error.message}`,
      };
    }
  }

  if (args.examplesDir !== undefined) {
    const value = String(args.examplesDir).trim();
    patch.examplesDir = value;
    if (value) patch.examplesSkipped = undefined;
  }
  if (args.skipExamples) patch.examplesSkipped = true;

  const docs = {};
  if (args.docsUrl !== undefined) {
    const value = String(args.docsUrl).trim();
    if (value && !/^https?:\/\//i.test(value)) throw new Error('docsUrl doit commencer par http:// ou https://');
    docs.url = value;
  }
  if (args.docsPath !== undefined) docs.path = String(args.docsPath).trim();
  if (args.skipDocs) docs.skipped = true;
  if (docs.url || docs.path) docs.skipped = undefined;
  if (Object.keys(docs).length) patch.docs = docs;

  const repo = {};
  if (args.repoUrl !== undefined) {
    const value = String(args.repoUrl).trim();
    if (value && !/^https?:\/\//i.test(value)) throw new Error('repoUrl doit être une URL http(s)');
    repo.url = value;
  }
  if (args.repoRef !== undefined) repo.ref = String(args.repoRef).trim();
  if (args.skipRepo) repo.skipped = true;
  if (repo.url) repo.skipped = undefined;
  if (Object.keys(repo).length) patch.repo = repo;

  if (!Object.keys(patch).length) {
    return text({ saved: false, message: 'Aucun champ fourni.', ...setupState() });
  }

  try {
    writeConfig(patch);
  } catch (error) {
    throw new Error(
      `impossible d'écrire ${CONFIG_FILE} : ${error.message}. ` +
        "Demandez-moi de modifier un réglage, ou utilisez le programme d'enregistrement du dossier de l'agent.", 
    );
  }

  // The save itself never completes onboarding: the caller must keep asking
  // until `missing` is empty.
  return text({ saved: true, ...projectResult, ...setupState() });
}

const HANDLERS = {
  jira_search: searchIssues,
  jira_get_issue: getIssue,
  jira_create_issue: createIssue,
  jira_add_comment: addComment,
  jira_create_meta: createMeta,
  jira_projects: listProjects,
  ticket_examples: ticketExamples,
  setup_read: setupRead,
  setup_save: setupSave,
  product_context: productContext,
};

/* ------------------------------------------------------------ JSON-RPC I/O */

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function handle(message) {
  const { id, method, params } = message;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: params?.protocolVersion || '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      },
    };
  }
  if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };
  if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
  if (method === 'resources/list') return { jsonrpc: '2.0', id, result: { resources: [] } };
  if (method === 'prompts/list') return { jsonrpc: '2.0', id, result: { prompts: [] } };

  if (method === 'tools/call') {
    const name = params?.name;
    const handler = HANDLERS[name];
    if (!handler) {
      return { jsonrpc: '2.0', id, result: failure(`Outil inconnu : ${name}`) };
    }
    try {
      return { jsonrpc: '2.0', id, result: await handler(params?.arguments ?? {}) };
    } catch (error) {
      log(`tools/call ${name} a échoué : ${error.message}`);
      return { jsonrpc: '2.0', id, result: failure(`Échec de ${name} : ${error.message}`) };
    }
  }

  if (id === undefined) return null;
  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Méthode non prise en charge : ${method}` },
  };
}

function handleLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return;
  let message;
  try {
    message = JSON.parse(trimmed);
  } catch {
    log('message JSON invalide ignoré');
    return;
  }
  handle(message)
    .then((reply) => {
      if (reply) send(reply);
    })
    .catch((error) => {
      log(`erreur interne : ${error.message}`);
      if (message?.id !== undefined) {
        send({ jsonrpc: '2.0', id: message.id, error: { code: -32603, message: error.message } });
      }
    });
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, index);
    buffer = buffer.slice(index + 1);
    handleLine(line);
  }
});
process.stdin.on('end', () => process.exit(0));

log(`serveur prêt (${SERVER_INFO.name} ${SERVER_INFO.version}), base=${config().base ?? 'non configurée'}`);
