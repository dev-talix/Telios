import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, Bot, CheckSquare, Play, DollarSign, Clock, AlertCircle } from "lucide-react";
import { api, type Run } from "../lib/api";

const STAT_CONFIG = [
  { key: "agents", label: "Active agents", icon: Bot, color: "#818cf8", glow: "#4361ee" },
  { key: "tasks_todo", label: "Tasks queued", icon: CheckSquare, color: "#60a5fa", glow: "#3b82f6" },
  { key: "tasks_running", label: "In progress", icon: Play, color: "#34d399", glow: "#10b981" },
  { key: "tasks_done", label: "Done today", icon: CheckSquare, color: "#a3e635", glow: "#84cc16" },
  { key: "runs_today", label: "Runs today", icon: Zap, color: "#f472b6", glow: "#ec4899" },
  { key: "cost_today", label: "Cost today", icon: DollarSign, color: "#fb923c", glow: "#f97316", format: (v: number) => `$${v.toFixed(3)}` },
] as const;

function StatCard({ label, value, icon: Icon, color, glow }: {
  label: string; value: string | number; icon: React.ElementType; color: string; glow: string;
}) {
  return (
    <div className="stat-card" style={{ ["--glow-color" as string]: glow }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{label}</div>
        <div style={{ padding: 6, borderRadius: 8, background: `${glow}18` }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.03em' }}>{value}</div>
    </div>
  );
}

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  pending:  { color: '#94a3b8', bg: '#94a3b820' },
  running:  { color: '#60a5fa', bg: '#3b82f620' },
  done:     { color: '#34d399', bg: '#10b98120' },
  failed:   { color: '#f87171', bg: '#ef444420' },
};

function RunRow({ run, agentName }: { run: Run; agentName: string }) {
  const s = STATUS_STYLES[run.status] ?? STATUS_STYLES.pending;
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #1a1f2e' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, marginTop: 5, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#cbd5e1' }}>{agentName}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: s.bg, color: s.color }}>
            {run.status}
          </span>
          {run.cost_usd > 0 && (
            <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>${run.cost_usd.toFixed(4)}</span>
          )}
        </div>
        {(run.output || run.error) && (
          <p style={{ fontSize: 12, color: run.error ? '#f87171' : '#475569', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            {run.error || run.output}
          </p>
        )}
        <div style={{ fontSize: 11, color: '#2d3a52', marginTop: 2 }}>
          {new Date(run.created_at).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const qc = useQueryClient();
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: api.stats, refetchInterval: 10_000 });
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: api.company.get });
  const { data: agents } = useQuery({ queryKey: ["agents"], queryFn: api.agents.list });
  const { data: runs } = useQuery({ queryKey: ["runs"], queryFn: () => api.runs.list({ limit: "15" }) });

  const initTalix = useMutation({
    mutationFn: api.initTalix,
    onSuccess: () => qc.invalidateQueries(),
  });

  const agentMap = new Map(agents?.map(a => [a.id, a.name]) ?? []);
  const hasSetup = company && agents?.length;

  return (
    <div style={{ padding: '32px 32px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0, letterSpacing: '-0.03em' }}>
              {company?.name ?? 'Welcome to Telos'}
            </h1>
            <p style={{ fontSize: 13.5, color: '#3d4f6e', marginTop: 4, maxWidth: 560 }}>
              {company?.mission ?? 'AI agent orchestration for your company. Start by seeding the Talix template.'}
            </p>
          </div>
          {!hasSetup && (
            <button className="btn-primary" onClick={() => initTalix.mutate()} disabled={initTalix.isPending}
              style={{ fontSize: 13, padding: '9px 16px', whiteSpace: 'nowrap' }}>
              <Zap size={14} />
              {initTalix.isPending ? 'Seeding…' : 'Seed Talix template'}
            </button>
          )}
        </div>

        {initTalix.isSuccess && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#4ade80' }}>
            <Zap size={14} />
            Seeded — {initTalix.data?.agents} agents, {initTalix.data?.goals} goals created. Navigate to Agents to get started.
          </div>
        )}
      </div>

      {/* Setup prompt */}
      {!hasSetup && !initTalix.isPending && (
        <div style={{ marginBottom: 28, padding: '20px 24px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(67,97,238,0.08), rgba(124,58,237,0.06))', border: '1px solid rgba(67,97,238,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertCircle size={18} style={{ color: '#818cf8', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#c7d2fe', marginBottom: 3 }}>No agents configured yet</div>
              <div style={{ fontSize: 13, color: '#4a5568' }}>
                Click "Seed Talix template" to create 7 pre-configured agents (CEO, CTO, Backend/Frontend Engineers, DevOps, QA, Security) with org hierarchy and goals.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        {STAT_CONFIG.map((cfg) => {
          const raw = stats?.[cfg.key as keyof typeof stats] ?? 0;
          const value = 'format' in cfg && cfg.format ? cfg.format(raw as number) : raw;
          return <StatCard key={cfg.key} label={cfg.label} value={value} icon={cfg.icon} color={cfg.color} glow={cfg.glow} />;
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent runs */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={13} /> Recent runs
          </div>
          {!runs?.length
            ? <div style={{ fontSize: 13, color: '#2d3a52', padding: '20px 0', textAlign: 'center' }}>No runs yet</div>
            : runs.map(r => <RunRow key={r.id} run={r} agentName={agentMap.get(r.agent_id) ?? 'Unknown'} />)
          }
        </div>

        {/* Agents list */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Bot size={13} /> Agents
          </div>
          {!agents?.length
            ? <div style={{ fontSize: 13, color: '#2d3a52', padding: '20px 0', textAlign: 'center' }}>No agents — seed template above</div>
            : agents.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid #1a1f2e' }}>
                <div className={a.status === 'active' ? 'pulse-green' : a.status === 'paused' ? 'pulse-yellow' : 'dot-gray'} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#cbd5e1' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: '#334155' }}>{a.title ?? a.role}</div>
                </div>
                <span className={a.type === 'hermes' ? 'tag-hermes' : a.type === 'claude_code' ? 'tag-claude' : 'tag-http'}>
                  {a.type === 'claude_code' ? 'claude' : a.type}
                </span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
