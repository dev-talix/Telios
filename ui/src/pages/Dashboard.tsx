import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, Bot, CheckSquare, Play, DollarSign, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { api, type Run } from "../lib/api";

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  pending: { color: '#94a3b8', bg: '#94a3b820' },
  running: { color: '#60a5fa', bg: '#3b82f620' },
  done:    { color: '#34d399', bg: '#10b98118' },
  failed:  { color: '#f87171', bg: '#ef444418' },
};

function RunRow({ run, agentName }: { run: Run; agentName: string }) {
  const s = STATUS_STYLES[run.status] ?? STATUS_STYLES.pending;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid #12161f' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {agentName}
        </div>
        {(run.output || run.error) && (
          <div style={{ fontSize: 12, color: run.error ? '#f8717180' : '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
            {run.error ?? run.output}
          </div>
        )}
      </div>
      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, flexShrink: 0 }}>
        {run.status}
      </span>
      <span style={{ fontSize: 11, color: '#263248', flexShrink: 0 }}>
        {new Date(run.created_at).toLocaleTimeString()}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const qc = useQueryClient();
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: api.stats, refetchInterval: 10_000 });
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: api.company.get });
  const { data: agents } = useQuery({ queryKey: ["agents"], queryFn: api.agents.list });
  const { data: runs } = useQuery({ queryKey: ["runs"], queryFn: () => api.runs.list({ limit: "20" }) });

  const initTalix = useMutation({ mutationFn: api.initTalix, onSuccess: () => qc.invalidateQueries() });
  const agentMap = new Map(agents?.map(a => [a.id, a.name]) ?? []);

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0, letterSpacing: '-0.03em' }}>
              {company?.name ?? 'Telios'}
            </h1>
            <p style={{ fontSize: 14, color: '#334155', marginTop: 6, maxWidth: 540, lineHeight: 1.6 }}>
              {company?.mission ?? 'AI agent orchestration. Start by seeding the Talix template.'}
            </p>
          </div>
          {!agents?.length && (
            <button className="btn-primary" onClick={() => initTalix.mutate()} disabled={initTalix.isPending}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              <Zap size={13} />
              {initTalix.isPending ? 'Seeding…' : 'Seed Talix template'}
            </button>
          )}
        </div>

        {initTalix.isSuccess && (
          <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)', fontSize: 13, color: '#4ade80' }}>
            <Zap size={13} /> Seeded — {initTalix.data?.agents} agents, {initTalix.data?.goals} goals. Go to Agents →
          </div>
        )}
      </div>

      {/* Setup notice */}
      {!agents?.length && !initTalix.isPending && (
        <div style={{ marginBottom: 36, padding: '16px 20px', borderRadius: 10, background: 'rgba(67,97,238,0.05)', border: '1px solid rgba(67,97,238,0.15)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <AlertCircle size={15} style={{ color: '#818cf8', marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.6 }}>
            No agents yet. Click <strong style={{ color: '#818cf8', fontWeight: 600 }}>Seed Talix template</strong> to create CEO, CTO, Backend, Frontend, DevOps, QA, and Security agents with a full org chart and goals.
          </div>
        </div>
      )}

      {/* Stat strip — flat row, no cards */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 40, borderTop: '1px solid #12161f', borderBottom: '1px solid #12161f' }}>
        {[
          { label: 'Active agents', value: stats?.agents ?? '—', color: '#818cf8' },
          { label: 'Queued', value: stats?.tasks_todo ?? '—', color: '#60a5fa' },
          { label: 'Running', value: stats?.tasks_running ?? '—', color: '#34d399' },
          { label: 'Done today', value: stats?.tasks_done ?? '—', color: '#a3e635' },
          { label: 'Runs today', value: stats?.runs_today ?? '—', color: '#f472b6' },
          { label: 'Cost today', value: stats ? `$${stats.cost_today.toFixed(3)}` : '—', color: '#fb923c' },
        ].map((s, i, arr) => (
          <div key={s.label} style={{
            flex: 1, padding: '20px 0', textAlign: 'center',
            borderRight: i < arr.length - 1 ? '1px solid #12161f' : 'none',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: '-0.04em' }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: '#334155', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Two column: runs + agents */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
        {/* Recent runs */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#3d4f6e', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
            Recent runs
          </div>
          {!runs?.length
            ? <div style={{ fontSize: 13, color: '#1e2a3a', padding: '24px 0' }}>No runs yet</div>
            : runs.map(r => <RunRow key={r.id} run={r} agentName={agentMap.get(r.agent_id) ?? 'Unknown'} />)
          }
        </div>

        {/* Agents */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#3d4f6e', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
            Agents
          </div>
          {!agents?.length
            ? <div style={{ fontSize: 13, color: '#1e2a3a', padding: '24px 0' }}>No agents configured</div>
            : agents.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #12161f' }}>
                <div className={a.status === 'active' ? 'pulse-green' : a.status === 'paused' ? 'pulse-yellow' : 'dot-gray'} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 500 }}>{a.name}</div>
                  <div style={{ fontSize: 11.5, color: '#334155', marginTop: 1 }}>{a.title ?? a.role}</div>
                </div>
                <span className={a.type === 'hermes' ? 'tag-hermes' : a.type === 'claude_code' ? 'tag-claude' : 'tag-http'} style={{ flexShrink: 0 }}>
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
