import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Play, Pause, RotateCcw, Terminal, Bot, Zap, Clock, DollarSign, AlertCircle } from "lucide-react";
import { api, type Agent } from "../lib/api";

function AgentTypeBadge({ type }: { type: Agent["type"] }) {
  if (type === "hermes") return <span className="tag-hermes">Hermes</span>;
  if (type === "claude_code") return <span className="tag-claude">Claude Code</span>;
  return <span className="tag-http">HTTP</span>;
}

function AgentCard({ agent, onRun, onToggle, running }: {
  agent: Agent;
  onRun: () => void;
  onToggle: () => void;
  running: boolean;
}) {
  return (
    <div className="card-hover" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: agent.type === 'hermes'
            ? 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(124,58,237,0.1))'
            : agent.type === 'claude_code'
            ? 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.1))'
            : 'linear-gradient(135deg, rgba(20,184,166,0.2), rgba(13,148,136,0.1))',
          border: `1px solid ${agent.type === 'hermes' ? 'rgba(139,92,246,0.3)' : agent.type === 'claude_code' ? 'rgba(249,115,22,0.3)' : 'rgba(20,184,166,0.3)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {agent.type === 'claude_code'
            ? <Terminal size={18} style={{ color: '#fb923c' }} />
            : <Bot size={18} style={{ color: agent.type === 'hermes' ? '#a78bfa' : '#2dd4bf' }} />
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{agent.name}</div>
          <div style={{ fontSize: 12, color: '#475569' }}>{agent.title ?? agent.role}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div className={agent.status === 'active' ? 'pulse-green' : agent.status === 'paused' ? 'pulse-yellow' : 'dot-gray'} />
          <AgentTypeBadge type={agent.type} />
        </div>
      </div>

      {/* Description */}
      {agent.description && (
        <p style={{ fontSize: 12.5, color: '#3d4f6e', lineHeight: 1.5, margin: 0 }}>{agent.description}</p>
      )}

      {/* Meta */}
      <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
        {agent.heartbeat_interval_mins && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#334155' }}>
            <Clock size={11} />
            {agent.heartbeat_interval_mins >= 1440
              ? `${agent.heartbeat_interval_mins / 1440}d`
              : agent.heartbeat_interval_mins >= 60
              ? `${agent.heartbeat_interval_mins / 60}h`
              : `${agent.heartbeat_interval_mins}m`}
          </div>
        )}
        {agent.budget_monthly_usd > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#334155' }}>
            <DollarSign size={11} />
            ${agent.budget_monthly_usd}/mo
          </div>
        )}
        {agent.last_heartbeat && (
          <div style={{ color: '#263248' }}>
            last {new Date(agent.last_heartbeat).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 4, borderTop: '1px solid #1a1f2e' }}>
        <button className="btn-primary" onClick={onRun} disabled={running} style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '7px 12px' }}>
          {running ? <><RotateCcw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Running…</> : <><Play size={12} /> Run now</>}
        </button>
        <button className="btn-ghost" onClick={onToggle} title={agent.status === 'active' ? 'Pause agent' : 'Resume agent'} style={{ padding: '7px 12px' }}>
          <Pause size={13} />
        </button>
      </div>
    </div>
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
      <div className="modal" style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>New agent</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>Configure an AI agent to work on Talix</p>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: 6 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#080a0f', padding: 4, borderRadius: 8 }}>
          {(['basic', 'advanced'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: tab === t ? '#1a2035' : 'transparent',
              color: tab === t ? '#818cf8' : '#475569',
              fontSize: 13, fontWeight: 500,
            }}>{t === 'basic' ? 'Basic' : 'Advanced'}</button>
          ))}
        </div>

        {tab === 'basic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Name *</label>
                <input className="input" value={form.name} onChange={set("name")} placeholder="Backend Engineer" />
              </div>
              <div>
                <label className="label">Role *</label>
                <input className="input" value={form.role} onChange={set("role")} placeholder="Engineer" />
              </div>
              <div>
                <label className="label">Title</label>
                <input className="input" value={form.title} onChange={set("title")} placeholder="Senior Backend Engineer" />
              </div>
              <div>
                <label className="label">Type *</label>
                <select className="input" value={form.type} onChange={set("type") as React.ChangeEventHandler<HTMLSelectElement>}>
                  <option value="claude_code">Claude Code</option>
                  <option value="hermes">Hermes</option>
                  <option value="http">HTTP</option>
                </select>
              </div>
              <div>
                <label className="label">Heartbeat (mins)</label>
                <input className="input" type="number" value={form.heartbeat_interval_mins} onChange={set("heartbeat_interval_mins")} placeholder="60" />
              </div>
              <div>
                <label className="label">Monthly budget ($)</label>
                <input className="input" type="number" value={form.budget_monthly_usd} onChange={set("budget_monthly_usd")} placeholder="0 = unlimited" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">Reports to</label>
                <select className="input" value={form.manager_id} onChange={set("manager_id") as React.ChangeEventHandler<HTMLSelectElement>}>
                  <option value="">— No manager —</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" style={{ height: 64, resize: 'none' }} value={form.description} onChange={set("description")} placeholder="What does this agent do?" />
            </div>
          </div>
        )}

        {tab === 'advanced' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">System prompt</label>
              <textarea className="input" style={{ height: 160, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
                value={form.system_prompt} onChange={set("system_prompt")}
                placeholder="You are a senior backend engineer at Talix. Your stack is Bun, Elysia, Prisma, PostgreSQL..." />
            </div>
            <div>
              <label className="label">Config (JSON)</label>
              <textarea className="input" style={{ height: 80, resize: 'none', fontFamily: 'monospace', fontSize: 12 }}
                value={form.config} onChange={set("config")} placeholder='{"model": "claude-opus-4-7", "workdir": "/path/to/project"}' />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center', padding: '9px 0' }}>Cancel</button>
          <button className="btn-primary" onClick={() => create.mutate()}
            disabled={!form.name || !form.role || create.isPending}
            style={{ flex: 1, justifyContent: 'center', padding: '9px 0' }}>
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
  const paused = agents?.filter(a => a.status === 'paused') ?? [];

  return (
    <div style={{ padding: '32px 32px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0, letterSpacing: '-0.03em' }}>Agents</h1>
          <p style={{ fontSize: 13, color: '#3d4f6e', marginTop: 4 }}>
            {agents?.length ? `${active.length} active${paused.length ? `, ${paused.length} paused` : ''}` : 'No agents configured'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!company && (
            <button className="btn-ghost" onClick={() => initTalix.mutate()} disabled={initTalix.isPending}
              style={{ fontSize: 13, color: '#818cf8' }}>
              <Zap size={13} /> Seed Talix
            </button>
          )}
          <button className="btn-primary" onClick={() => {
            if (!company) { initTalix.mutate(); } else { setShowNew(true); }
          }} style={{ fontSize: 13, padding: '8px 14px' }}>
            <Plus size={13} /> New agent
          </button>
        </div>
      </div>

      {/* No company warning */}
      {!company && (
        <div style={{ marginBottom: 24, padding: '16px 20px', borderRadius: 12, background: 'rgba(67,97,238,0.06)', border: '1px solid rgba(67,97,238,0.18)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertCircle size={16} style={{ color: '#818cf8', flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: '#64748b' }}>
            No company set up yet. Click <strong style={{ color: '#818cf8' }}>"Seed Talix"</strong> to create the full Talix org with 7 pre-configured agents, or go to Dashboard.
          </div>
        </div>
      )}

      {/* Empty state */}
      {company && !agents?.length && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(67,97,238,0.1)', border: '1px solid rgba(67,97,238,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Bot size={24} style={{ color: '#4361ee' }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>No agents yet</div>
          <div style={{ fontSize: 13, color: '#334155', marginBottom: 20 }}>
            Create your first agent or seed the full Talix org template.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn-ghost" onClick={() => initTalix.mutate()} disabled={initTalix.isPending}
              style={{ color: '#818cf8' }}>
              <Zap size={13} /> Seed Talix template
            </button>
            <button className="btn-primary" onClick={() => setShowNew(true)}>
              <Plus size={13} /> New agent
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {agents?.filter(a => a.status !== 'terminated').map(a => (
          <AgentCard
            key={a.id}
            agent={a}
            running={runningId === a.id}
            onRun={() => run.mutate(a.id)}
            onToggle={() => toggle.mutate(a)}
          />
        ))}
      </div>

      {showNew && company && (
        <NewAgentModal companyId={company.id} agents={agents ?? []} onClose={() => setShowNew(false)} />
      )}
    </div>
  );
}
