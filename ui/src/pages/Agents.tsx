import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Play, Pause, RotateCcw, Terminal, Bot, Zap, AlertCircle, ChevronRight } from "lucide-react";
import { api, type Agent } from "../lib/api";

function AgentRow({ agent, onRun, onToggle, running }: {
  agent: Agent; onRun: () => void; onToggle: () => void; running: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '12px 0', borderBottom: '1px solid #12161f',
          cursor: 'pointer', transition: 'background 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.015)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Status */}
        <div className={agent.status === 'active' ? 'pulse-green' : agent.status === 'paused' ? 'pulse-yellow' : 'dot-gray'} style={{ flexShrink: 0, marginLeft: 2 }} />

        {/* Icon */}
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: agent.type === 'hermes' ? 'rgba(139,92,246,0.12)' : agent.type === 'claude_code' ? 'rgba(249,115,22,0.12)' : 'rgba(20,184,166,0.12)',
          border: `1px solid ${agent.type === 'hermes' ? 'rgba(139,92,246,0.22)' : agent.type === 'claude_code' ? 'rgba(249,115,22,0.22)' : 'rgba(20,184,166,0.22)'}`,
        }}>
          {agent.type === 'claude_code'
            ? <Terminal size={14} style={{ color: '#fb923c' }} />
            : <Bot size={14} style={{ color: agent.type === 'hermes' ? '#a78bfa' : '#2dd4bf' }} />}
        </div>

        {/* Name + role */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#e2e8f0' }}>{agent.name}</div>
          <div style={{ fontSize: 12, color: '#334155', marginTop: 1 }}>{agent.title ?? agent.role}</div>
        </div>

        {/* Type badge */}
        <span className={agent.type === 'hermes' ? 'tag-hermes' : agent.type === 'claude_code' ? 'tag-claude' : 'tag-http'} style={{ flexShrink: 0 }}>
          {agent.type === 'claude_code' ? 'claude' : agent.type}
        </span>

        {/* Heartbeat */}
        {agent.heartbeat_interval_mins && (
          <span style={{ fontSize: 11.5, color: '#2d3a52', flexShrink: 0, minWidth: 40 }}>
            {agent.heartbeat_interval_mins >= 1440
              ? `${agent.heartbeat_interval_mins / 1440}d`
              : agent.heartbeat_interval_mins >= 60
              ? `${agent.heartbeat_interval_mins / 60}h`
              : `${agent.heartbeat_interval_mins}m`}
          </span>
        )}

        {/* Budget */}
        {agent.budget_monthly_usd > 0 && (
          <span style={{ fontSize: 11.5, color: '#2d3a52', flexShrink: 0, minWidth: 48 }}>
            ${agent.budget_monthly_usd}/mo
          </span>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button className="btn-ghost" onClick={onRun} disabled={running}
            style={{ padding: '5px 8px', fontSize: 12, color: running ? '#334155' : '#60a5fa' }}>
            {running ? <RotateCcw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={12} />}
          </button>
          <button className="btn-ghost" onClick={onToggle} style={{ padding: '5px 8px' }}>
            <Pause size={12} style={{ color: agent.status === 'paused' ? '#34d399' : '#475569' }} />
          </button>
        </div>

        <ChevronRight size={13} style={{ color: '#1e2a3a', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '12px 0 16px 48px', borderBottom: '1px solid #12161f', background: 'rgba(0,0,0,0.2)' }}>
          {agent.description && (
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 10, lineHeight: 1.6 }}>{agent.description}</p>
          )}
          {agent.system_prompt && (
            <pre style={{ fontSize: 11.5, color: '#334155', background: '#080a0f', border: '1px solid #1a1f2e', borderRadius: 6, padding: '10px 12px', overflowX: 'auto', margin: 0, fontFamily: 'monospace', lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: 120 }}>
              {agent.system_prompt.slice(0, 300)}{agent.system_prompt.length > 300 ? '…' : ''}
            </pre>
          )}
          {agent.last_heartbeat && (
            <div style={{ fontSize: 11, color: '#1e2a3a', marginTop: 8 }}>
              Last heartbeat: {new Date(agent.last_heartbeat).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </>
  );
}

const FORM_DEFAULTS = {
  name: "", type: "claude_code" as Agent["type"], role: "",
  title: "", description: "", system_prompt: "",
  heartbeat_interval_mins: "", budget_monthly_usd: "0",
  manager_id: "", config: "{}",
};

function NewAgentModal({ companyId, agents, onClose }: { companyId: string; agents: Agent[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(FORM_DEFAULTS);
  const [tab, setTab] = useState<"basic" | "advanced">("basic");

  const create = useMutation({
    mutationFn: () => api.agents.create({
      ...form,
      company_id: companyId,
      heartbeat_interval_mins: form.heartbeat_interval_mins ? Number(form.heartbeat_interval_mins) : undefined,
      budget_monthly_usd: Number(form.budget_monthly_usd),
      manager_id: form.manager_id || undefined,
      config: (() => { try { return JSON.parse(form.config); } catch { return {}; } })(),
    }),
    onSuccess: () => { qc.invalidateQueries(); onClose(); },
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>New agent</h2>
          <button className="btn-ghost" onClick={onClose} style={{ padding: 6, fontSize: 16, color: '#334155' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid #1a1f2e' }}>
          {(['basic', 'advanced'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer', background: 'transparent',
              color: tab === t ? '#818cf8' : '#334155',
              borderBottom: tab === t ? '2px solid #4361ee' : '2px solid transparent',
              fontSize: 13, fontWeight: 500, marginBottom: -1,
            }}>{t === 'basic' ? 'Basic' : 'Advanced'}</button>
          ))}
        </div>

        {tab === 'basic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="label">Name *</label><input className="input" value={form.name} onChange={set("name")} placeholder="Backend Engineer" /></div>
              <div><label className="label">Role *</label><input className="input" value={form.role} onChange={set("role")} placeholder="Engineer" /></div>
              <div><label className="label">Title</label><input className="input" value={form.title} onChange={set("title")} placeholder="Senior Backend Engineer" /></div>
              <div>
                <label className="label">Type *</label>
                <select className="input" value={form.type} onChange={set("type") as React.ChangeEventHandler<HTMLSelectElement>}>
                  <option value="claude_code">Claude Code</option>
                  <option value="hermes">Hermes</option>
                  <option value="http">HTTP</option>
                </select>
              </div>
              <div><label className="label">Heartbeat (mins)</label><input className="input" type="number" value={form.heartbeat_interval_mins} onChange={set("heartbeat_interval_mins")} placeholder="60" /></div>
              <div><label className="label">Budget ($/mo)</label><input className="input" type="number" value={form.budget_monthly_usd} onChange={set("budget_monthly_usd")} placeholder="0 = unlimited" /></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">Reports to</label>
                <select className="input" value={form.manager_id} onChange={set("manager_id") as React.ChangeEventHandler<HTMLSelectElement>}>
                  <option value="">— No manager —</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div><label className="label">Description</label><textarea className="input" style={{ height: 60, resize: 'none' }} value={form.description} onChange={set("description")} /></div>
          </div>
        )}

        {tab === 'advanced' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="label">System prompt</label>
              <textarea className="input" style={{ height: 160, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} value={form.system_prompt} onChange={set("system_prompt")} placeholder="You are a senior backend engineer…" />
            </div>
            <div>
              <label className="label">Config JSON</label>
              <textarea className="input" style={{ height: 72, resize: 'none', fontFamily: 'monospace', fontSize: 12 }} value={form.config} onChange={set("config")} placeholder='{"model": "claude-opus-4-7", "workdir": "/path"}' />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #1a1f2e' }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button className="btn-primary" onClick={() => create.mutate()} disabled={!form.name || !form.role || create.isPending} style={{ flex: 1, justifyContent: 'center' }}>
            {create.isPending ? 'Creating…' : 'Create agent'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Agents() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const { data: agents } = useQuery({ queryKey: ["agents"], queryFn: api.agents.list });
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: api.company.get });

  const initTalix = useMutation({ mutationFn: api.initTalix, onSuccess: () => qc.invalidateQueries() });

  const toggle = useMutation({
    mutationFn: (a: Agent) => api.agents.update(a.id, { status: a.status === "active" ? "paused" : "active" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });

  const run = useMutation({
    mutationFn: (id: string) => { setRunningId(id); return api.agents.run(id); },
    onSettled: () => setRunningId(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["runs"] }),
  });

  const active = agents?.filter(a => a.status !== 'terminated') ?? [];

  return (
    <div style={{ padding: '36px 40px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0, letterSpacing: '-0.03em' }}>Agents</h1>
          <p style={{ fontSize: 13, color: '#334155', marginTop: 5 }}>
            {active.length ? `${active.length} agent${active.length > 1 ? 's' : ''}` : 'No agents configured'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!company && (
            <button className="btn-ghost" onClick={() => initTalix.mutate()} disabled={initTalix.isPending} style={{ color: '#818cf8' }}>
              <Zap size={13} /> Seed Talix
            </button>
          )}
          <button className="btn-primary" onClick={() => company ? setShowNew(true) : initTalix.mutate()} style={{ fontSize: 13 }}>
            <Plus size={13} /> New agent
          </button>
        </div>
      </div>

      {!company && (
        <div style={{ marginBottom: 28, padding: '14px 18px', borderRadius: 10, background: 'rgba(67,97,238,0.05)', border: '1px solid rgba(67,97,238,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={14} style={{ color: '#818cf8', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#475569' }}>No company yet — click <strong style={{ color: '#818cf8' }}>Seed Talix</strong> to create all agents.</span>
        </div>
      )}

      {company && !agents?.length && (
        <div style={{ padding: '48px 0', textAlign: 'center', color: '#334155' }}>
          <Bot size={28} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: '#475569', marginBottom: 6 }}>No agents yet</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            <button className="btn-ghost" onClick={() => initTalix.mutate()} style={{ color: '#818cf8' }}><Zap size={13} /> Seed Talix</button>
            <button className="btn-primary" onClick={() => setShowNew(true)}><Plus size={13} /> New agent</button>
          </div>
        </div>
      )}

      {/* Column headers */}
      {active.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 8, borderBottom: '1px solid #1a1f2e', marginBottom: 0 }}>
          <div style={{ width: 10, flexShrink: 0 }} />
          <div style={{ width: 32, flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#2d3a52', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Name</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#2d3a52', letterSpacing: '0.06em', textTransform: 'uppercase', width: 80, flexShrink: 0 }}>Type</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#2d3a52', letterSpacing: '0.06em', textTransform: 'uppercase', width: 40, flexShrink: 0 }}>Beat</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#2d3a52', letterSpacing: '0.06em', textTransform: 'uppercase', width: 48, flexShrink: 0 }}>Budget</div>
          <div style={{ width: 60, flexShrink: 0 }} />
          <div style={{ width: 13, flexShrink: 0 }} />
        </div>
      )}

      {active.map(a => (
        <AgentRow
          key={a.id}
          agent={a}
          running={runningId === a.id}
          onRun={() => run.mutate(a.id)}
          onToggle={() => toggle.mutate(a)}
        />
      ))}

      {showNew && company && (
        <NewAgentModal companyId={company.id} agents={agents ?? []} onClose={() => setShowNew(false)} />
      )}
    </div>
  );
}
