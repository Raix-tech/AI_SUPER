import { ChevronDown, ChevronUp, Laptop, ShieldCheck, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  AIAgent,
  AutoApproveProfileId,
  AutoApproveSettings,
  PcAccessMode,
  PcAccessSettings,
} from '../types/ai';
import {
  AUTO_APPROVE_PROFILES,
  buildAutoApproveProfileSettings,
  getDefaultAutoApproveSettings,
} from '../utils/autoApprove';
import { countEnabledAutoApproveKeys } from '../utils/agentPermissions';
import { getDefaultPcAccessClient } from '../utils/pcActions';

interface AgentPermissionsPanelProps {
  agent: AIAgent;
  globalPcAccess?: PcAccessSettings;
  globalAutoApprove?: AutoApproveSettings;
  onChange: (patch: Partial<AIAgent>) => void;
}

const PC_MODE_OPTIONS: Array<{ id: PcAccessMode; label: string; hint: string }> = [
  { id: 'none', label: 'Nessun accesso', hint: 'Nessuno strumento locale autorizzato' },
  { id: 'limited', label: 'Limitato', hint: 'Solo strumenti sicuri (browser, IDE, Office)' },
  { id: 'custom', label: 'Personalizzato', hint: 'Gruppi e strumenti scelti manualmente' },
  { id: 'full', label: 'Completo', hint: 'Tutti gli strumenti rilevati sul PC' },
];

export function AgentPermissionsPanel({
  agent,
  globalPcAccess,
  globalAutoApprove,
  onChange,
}: AgentPermissionsPanelProps) {
  const [open, setOpen] = useState(Boolean(agent.inheritAgentPermissions));

  const inherit = agent.inheritAgentPermissions === true;
  const pcAccess = agent.pcAccessOverride ?? globalPcAccess ?? getDefaultPcAccessClient();
  const autoApprove =
    agent.autoApproveOverride ?? globalAutoApprove ?? getDefaultAutoApproveSettings();
  const enabledCount = useMemo(() => countEnabledAutoApproveKeys(autoApprove), [autoApprove]);
  const activeProfile: AutoApproveProfileId = autoApprove.profile ?? 'custom';

  const handleToggleInherit = (value: boolean) => {
    if (value) {
      onChange({
        inheritAgentPermissions: true,
        pcAccessOverride:
          agent.pcAccessOverride ?? globalPcAccess ?? getDefaultPcAccessClient(),
        autoApproveOverride:
          agent.autoApproveOverride ?? globalAutoApprove ?? getDefaultAutoApproveSettings(),
      });
      setOpen(true);
      return;
    }
    onChange({ inheritAgentPermissions: false });
    setOpen(false);
  };

  const handlePcMode = (mode: PcAccessMode) => {
    const base = { ...pcAccess, mode };
    if (mode === 'full') base.allowAllInstalled = true;
    onChange({ pcAccessOverride: base });
  };

  const handleProfile = (profileId: AutoApproveProfileId) => {
    onChange({
      autoApproveOverride: buildAutoApproveProfileSettings(profileId, autoApprove),
    });
  };

  const handleCopyGlobal = () => {
    onChange({
      inheritAgentPermissions: true,
      pcAccessOverride: globalPcAccess ?? getDefaultPcAccessClient(),
      autoApproveOverride: globalAutoApprove ?? getDefaultAutoApproveSettings(),
    });
  };

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
              Permessi ereditati in tutte le chat
            </div>
            <p className="text-[11px] text-indigo-800/90 dark:text-indigo-300/90 mt-0.5 leading-relaxed">
              Se attivo, Accesso al PC e Auto-Approve definiti qui valgono per ogni chat in cui
              questo agente è selezionato: il modello non richiederà più autorizzazioni già
              concesse.
            </p>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={inherit}
            onChange={(e) => handleToggleInherit(e.target.checked)}
            className="h-4 w-4 accent-indigo-600"
          />
          <span className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-200">
            {inherit ? 'Attivo' : 'Disattivo'}
          </span>
        </label>
      </div>

      {inherit && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-white/80 dark:bg-zinc-900/80 border border-indigo-200 dark:border-indigo-900/60 px-2 py-0.5 text-[11px] font-semibold text-indigo-800 dark:text-indigo-200">
              {enabledCount} permessi Auto-Approve attivi
            </span>
            <button
              type="button"
              onClick={handleCopyGlobal}
              className="inline-flex items-center gap-1 rounded-md border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40"
            >
              <Sparkles className="w-3 h-3" />
              Copia impostazioni globali
            </button>
            <button
              type="button"
              onClick={() => setOpen((p) => !p)}
              className="inline-flex items-center gap-1 rounded-md border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40"
            >
              {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {open ? 'Nascondi dettagli' : 'Configura permessi'}
            </button>
          </div>

          {open && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-indigo-900 dark:text-indigo-200">
                  <Laptop className="w-3.5 h-3.5" />
                  Accesso al PC
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {PC_MODE_OPTIONS.map((opt) => {
                    const selected = pcAccess.mode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        title={opt.hint}
                        onClick={() => handlePcMode(opt.id)}
                        className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                          selected
                            ? 'border-indigo-500 bg-indigo-600 text-white'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wide text-indigo-900 dark:text-indigo-200">
                  Profilo Auto-Approve
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {AUTO_APPROVE_PROFILES.map((profile) => {
                    const selected = activeProfile === profile.id;
                    return (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => handleProfile(profile.id)}
                        className={`text-left rounded-lg border px-2.5 py-1.5 transition-colors ${
                          selected
                            ? 'border-indigo-500 bg-white dark:bg-zinc-900 ring-1 ring-indigo-500/40'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
                            {profile.name}
                          </span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            {profile.riskTag}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                          {profile.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-indigo-800/80 dark:text-indigo-300/80">
                  Per la selezione granulare dei singoli permessi usa Impostazioni → Auto-Approve:
                  qui scegli il profilo che l'agente eredita in ogni chat.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}