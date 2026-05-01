import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Unlock, ChevronDown } from "lucide-react";
import { api, type Task } from "../lib/api";

const PRIORITY_DOT: Record<string, string> = {
  urgent: '#f87171', high: '#fb923c', normal: '#60a5fa', low: '#334155',
};

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  todo:        { color: '#475569', label: 'Todo' },
  in_progress: { color: '#60a5fa', label: 'In progress' },
  done:        { color: '#34d399', label: 'Done' },
  blocked:     { color: '#f87171', label: 'Blocked' },
  cancelled:   { color: '#1e2a3a', label: 'Cancelled' },
};

function StatusPicker({ current, onChange }: { current: Task["status"]; onChange: (s: Task["status"]) => void }) {
  const [open, setOpen] = useState(false);
  const s = STATUS_STYLES[current];

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'transparent', border: 'none', cursor: 'pointer', padding: '3px 6px', borderRadius: 6,
        fontSize: 12, color: s.color, fontWeight: 500,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
        {s.label}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 50,
          background: '#0e1117', border: '1px solid #1e2540', borderRadius: 8,
          padding: 4, minWidth: 120, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {(Object.entries(STATUS_STYLES) as [Task["status"], { color: string; label: string }][]).map(([key, val]) => (
            <button key={key} onClick={() => { onChange(key); setOpen(false); }} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '7px 10px', borderRadius: 5, border: 'none', cursor: 'pointer',
              background: key === current ? 'rgba(255,255,255,0.04)' : 'transparent',
              fontSize: 12.5, color: val.color, textAlign: 'left',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: val.color }} />
              {val.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NewTaskModal({ companyId, agents, goals, onClose }: {
  companyId: string; agents: { id: string; name: string }[]; goals: { id: string; title: string }[]; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<{ title: string; description: string; priority: Task["priority"]; assignee_id: string; goal_id: string }>({
    title: "", description: "", priority: "normal", assignee_id: "", goal_id: "",
  });

  const create = useMutation({
    mutationFn: () => api.tasks.create({ ...form, company_id: companyId, assignee_id: form.assignee_id || undefined, goal_id: form.goal_id || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); onClose(); },
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>New task</h2>
          <button className="btn-ghost" onClick={onClose} style={{ padding: 6 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label className="label">Title *</label><input className="input" value={form.title} onChange={set("title")} placeholder="Build invoice PDF export" /></div>
          <div><label className="label">Description</label><textarea className="input" style={{ height: 72, resize: 'none' }} value={form.description} onChange={set("description")} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={set("priority") as React.ChangeEventHandler<HTMLSelectElement>}>
                <option value="low">Low</option><option value="normal">Normal</option>
                <option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="label">Assignee</label>
              <select className="input" value={form.assignee_id} onChange={set("assignee_id") as React.ChangeEventHandler<HTMLSelectElement>}>
                <option value="">— Unassigned —</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Goal</label>
              <select className="input" value={form.goal_id} onChange={set("goal_id") as React.ChangeEventHandler<HTMLSelectElement>}>
                <option value="">— None —</option>
                {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18, paddingTop: 14, borderTop: '1px solid #1a1f2e' }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button className="btn-primary" onClick={() => create.mutate()} disabled={!form.title || create.isPending} style={{ flex: 1, justifyContent: 'center' }}>
            {create.isPending ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Tasks() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<Task["status"] | "all">("all");
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: () => api.tasks.list() });
  const { data: agents } = useQuery({ queryKey: ["agents"], queryFn: api.agents.list });
  const { data: goals } = useQuery({ queryKey: ["goals"], queryFn: api.goals.list });
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: api.company.get });

  const agentMap = new Map(agents?.map(a => [a.id, a.name]) ?? []);
  const goalMap = new Map(goals?.map(g => [g.id, g.title]) ?? []);

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Task["status"] }) => api.tasks.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const release = useMutation({
    mutationFn: (id: string) => api.tasks.release(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.tasks.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const FILTERS: { value: Task["status"] | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "todo", label: "Todo" },
    { value: "in_progress", label: "In progress" },
    { value: "done", label: "Done" },
    { value: "blocked", label: "Blocked" },
  ];

  const filtered = tasks?.filter(t => filter === "all" || t.status === filter) ?? [];

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0, letterSpacing: '-0.03em' }}>Tasks</h1>
          <p style={{ fontSize: 13, color: '#334155', marginTop: 5 }}>{tasks?.length ?? 0} total</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)} style={{ fontSize: 13 }}>
          <Plus size={13} /> New task
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 0, borderBottom: '1px solid #1a1f2e' }}>
        {FILTERS.map(f => {
          const count = f.value === "all" ? tasks?.length : tasks?.filter(t => t.status === f.value).length;
          return (
            <button key={f.value} onClick={() => setFilter(f.value)} style={{
              padding: '8px 14px', border: 'none', cursor: 'pointer', background: 'transparent',
              fontSize: 13, fontWeight: 500,
              color: filter === f.value ? '#818cf8' : '#334155',
              borderBottom: filter === f.value ? '2px solid #4361ee' : '2px solid transparent',
              marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {f.label}
              {count != null && count > 0 && (
                <span style={{ fontSize: 11, background: filter === f.value ? 'rgba(67,97,238,0.2)' : '#12161f', color: filter === f.value ? '#818cf8' : '#334155', padding: '1px 6px', borderRadius: 20, fontWeight: 600 }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Column headers */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0', borderBottom: '1px solid #12161f' }}>
          <div style={{ width: 8, flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#2d3a52', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Task</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#2d3a52', letterSpacing: '0.06em', textTransform: 'uppercase', width: 110, flexShrink: 0 }}>Status</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#2d3a52', letterSpacing: '0.06em', textTransform: 'uppercase', width: 130, flexShrink: 0 }}>Assignee</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#2d3a52', letterSpacing: '0.06em', textTransform: 'uppercase', width: 100, flexShrink: 0 }}>Goal</div>
          <div style={{ width: 40, flexShrink: 0 }} />
        </div>
      )}

      {!filtered.length && (
        <div style={{ textAlign: 'center', padding: '52px 0', color: '#1e2a3a', fontSize: 13 }}>
          {filter === "all" ? "No tasks yet — create one above" : `No ${filter} tasks`}
        </div>
      )}

      {filtered.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0', borderBottom: '1px solid #12161f' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

          {/* Priority dot */}
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_DOT[t.priority], flexShrink: 0, marginLeft: 1 }} />

          {/* Title + description */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, color: '#cbd5e1', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.title}
            </div>
            {t.description && (
              <div style={{ fontSize: 12, color: '#2d3a52', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.description}
              </div>
            )}
          </div>

          {/* Status picker */}
          <div style={{ width: 110, flexShrink: 0 }}>
            <StatusPicker current={t.status} onChange={status => move.mutate({ id: t.id, status })} />
          </div>

          {/* Assignee */}
          <div style={{ width: 130, flexShrink: 0, fontSize: 12.5, color: t.assignee_id ? '#475569' : '#1e2a3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.assignee_id ? agentMap.get(t.assignee_id) ?? '?' : '—'}
          </div>

          {/* Goal */}
          <div style={{ width: 100, flexShrink: 0, fontSize: 12, color: '#2d3a52', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.goal_id ? goalMap.get(t.goal_id) ?? '—' : '—'}
          </div>

          {/* Actions */}
          <div style={{ width: 40, display: 'flex', gap: 4, flexShrink: 0 }}>
            {t.checkout_run_id && (
              <button className="btn-ghost" onClick={() => release.mutate(t.id)} title="Release lock" style={{ padding: 4 }}>
                <Unlock size={11} style={{ color: '#eab308' }} />
              </button>
            )}
            <button className="btn-ghost" onClick={() => { if (confirm('Delete task?')) del.mutate(t.id); }} style={{ padding: 4, fontSize: 14, color: '#1e2a3a' }}>
              ×
            </button>
          </div>
        </div>
      ))}

      {showNew && company && (
        <NewTaskModal companyId={company.id} agents={agents ?? []} goals={goals ?? []} onClose={() => setShowNew(false)} />
      )}
    </div>
  );
}
