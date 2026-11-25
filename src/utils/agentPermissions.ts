import type { AIAgent, AutoApproveSettings, PcAccessSettings } from '../types/ai';
import {
  AUTO_APPROVE_CATEGORIES,
  getDefaultAutoApproveSettings,
  sanitizeAutoApproveSettings,
} from './autoApprove';
import { getDefaultPcAccessClient } from './pcActions';

/**
 * Permessi effettivi calcolati per l'agente attivo.
 * Quando l'agente ha `inheritAgentPermissions`, PC Access e Auto-Approve definiti
 * nell'agente valgono per TUTTE le chat in cui quell'agente è selezionato.
 */
export interface ResolvedAgentPermissions {
  pcAccess: PcAccessSettings;
  autoApprove: AutoApproveSettings;
  inherited: boolean;
  agentName: string;
}

export function resolveAgentPermissions(
  agent: AIAgent | undefined,
  globalPcAccess?: PcAccessSettings,
  globalAutoApprove?: AutoApproveSettings,
): ResolvedAgentPermissions {
  const basePc = globalPcAccess ?? getDefaultPcAccessClient();
  const baseAuto = globalAutoApprove ?? getDefaultAutoApproveSettings();

  if (!agent || agent.inheritAgentPermissions !== true) {
    return {
      pcAccess: basePc,
      autoApprove: baseAuto,
      inherited: false,
      agentName: agent?.name ?? 'Assistente AI',
    };
  }

  return {
    pcAccess: agent.pcAccessOverride ?? basePc,
    autoApprove: agent.autoApproveOverride ?? baseAuto,
    inherited: true,
    agentName: agent.name,
  };
}

/** Chiavi Auto-Approve attualmente attive. */
export function getEnabledAutoApproveKeys(settings?: AutoApproveSettings): string[] {
  const cfg = settings ?? getDefaultAutoApproveSettings();
  const obj = cfg as unknown as Record<string, Record<string, boolean>>;
  const keys: string[] = [];
  for (const cat of AUTO_APPROVE_CATEGORIES) {
    for (const item of cat.items) {
      if (obj[cat.id]?.[item.key]) keys.push(item.key);
    }
  }
  return keys;
}

export function countEnabledAutoApproveKeys(settings?: AutoApproveSettings): number {
  return getEnabledAutoApproveKeys(settings).length;
}

export function countTotalAutoApproveKeys(): number {
  return AUTO_APPROVE_CATEGORIES.reduce((acc, cat) => acc + cat.items.length, 0);
}

/** Attiva un set di chiavi permesso in una configurazione Auto-Approve. */
export function enablePermissionKeysInAutoApprove(
  settings: AutoApproveSettings,
  keys: string[],
): AutoApproveSettings {
  const wanted = new Set(keys.filter((k) => typeof k === 'string' && k.trim().length > 0));
  if (wanted.size === 0) return settings;

  const cloned = sanitizeAutoApproveSettings(settings, settings);
  const obj = cloned as unknown as Record<string, Record<string, boolean>>;
  let changed = false;

  for (const cat of AUTO_APPROVE_CATEGORIES) {
    for (const item of cat.items) {
      if (!wanted.has(item.key)) continue;
      if (obj[cat.id]?.[item.key] !== true) {
        obj[cat.id][item.key] = true;
        changed = true;
      }
    }
  }

  if (!changed) return settings;
  return cloned;
}

/**
 * Riversa i permessi concessi in chat dentro il profilo dell'agente, così che
 * tutte le chat successive li ereditino senza richiedere di nuovo conferma.
 * Restituisce `null` se non serve aggiornare nulla.
 */
export function mergePermissionsIntoAgent(
  agents: AIAgent[],
  agentId: string,
  permissionKeys: string[],
  globalAutoApprove?: AutoApproveSettings,
): AIAgent[] | null {
  const target = agents.find((a) => a.id === agentId);
  if (!target) return null;

  const keys = permissionKeys.filter((k) => typeof k === 'string' && k.trim().length > 0);
  if (keys.length === 0) return null;

  const baseAuto =
    target.autoApproveOverride ?? globalAutoApprove ?? getDefaultAutoApproveSettings();
  const nextAuto = enablePermissionKeysInAutoApprove(baseAuto, keys);

  const alreadyInheriting = target.inheritAgentPermissions === true;
  const autoUnchanged = nextAuto === baseAuto && target.autoApproveOverride !== undefined;
  if (alreadyInheriting && autoUnchanged) return null;

  const now = new Date().toISOString();
  return agents.map((a) =>
    a.id === agentId
      ? {
          ...a,
          inheritAgentPermissions: true,
          autoApproveOverride: nextAuto,
          updatedAt: now,
        }
      : a,
  );
}

/**
 * Blocco di sistema che dice al modello che i permessi sono già concessi
 * dall'agente e che non deve chiedere nuove autorizzazioni.
 */
export function buildAgentPermissionsSystemPrompt(
  resolved: ResolvedAgentPermissions,
): string {
  if (!resolved.inherited) return '';

  const enabled = getEnabledAutoApproveKeys(resolved.autoApprove);
  const modeLabel =
    resolved.pcAccess.mode === 'full'
      ? 'Accesso completo'
      : resolved.pcAccess.mode === 'custom'
        ? 'Accesso personalizzato'
        : resolved.pcAccess.mode === 'limited'
          ? 'Accesso limitato'
          : 'Nessun accesso';

  return [
    `[PERMESSI EREDITATI DALL'AGENTE "${resolved.agentName}" — GIÀ AUTORIZZATI]`,
    `Le autorizzazioni seguenti sono configurate dall'utente nel profilo dell'agente e valgono per TUTTE le chat con questo agente. Modalità Accesso al PC: ${modeLabel}.`,
    'IMPORTANTE: non chiedere all’utente di autorizzare operazioni già coperte da questi permessi e non dichiarare che serve una nuova approvazione: proponi direttamente il blocco operativo (aihub-pc-exec / aihub-write / aihub-read).',
    `Permessi Auto-Approve attivi (${enabled.length}): ${enabled.join(', ') || 'nessuno'}.`,
    'Se un’operazione non rientra nei permessi elencati, indica in una riga quale permesso manca nel profilo dell’agente (Impostazioni → Agenti → permessi) invece di ripetere la richiesta.',
  ].join('\n');
}

/** Riepilogo compatto per la UI. */
export function describeAgentPermissions(agent: AIAgent | undefined): string | null {
  if (!agent?.inheritAgentPermissions) return null;
  const auto = agent.autoApproveOverride;
  const profile = auto?.profile ?? 'custom';
  const count = auto ? getEnabledAutoApproveKeys(auto).length : 0;
  const mode = agent.pcAccessOverride?.mode ?? 'globale';
  return `Profilo ${profile} · ${count} permessi · PC: ${mode}`;
}