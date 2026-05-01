import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Target, CheckCircle2, Circle } from "lucide-react";
import { api, type Goal } from "../lib/api";

function GoalRow({ goal, taskCount, depth = 0, onToggle, onDelete }: {
  goal: Goal; taskCount: number; depth?: number;
  onToggle: () => void; onDelete: () => void;
}) {
  const done = goal.status === "completed";

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 0', paddingLeft: depth * 24,
      borderBottom: '1px solid #12161f',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

      <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, display: 'flex', color: done ? '#34d399' : '#334155' }}>
        {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: done ? '#334155' : '#cbd5e1', fontWeight: 500, textDecoration: done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {goal.title}
        </div>
        {goal.description && (
          <div style={{ fontSize: 12, color: '#263248', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {goal.description}
          </div>
        )}
      </div>

      {taskCount > 0 && (
        <span style={{ fontSize: 11.5, color: '#2d3a52', flexShrink: 0 }}>
          {taskCount} task{taskCount > 1 ? 's' : ''}
        </span>
      )}

      <span style={{
        fontSize: 11, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
        background: done ? 'rgba(52,211,153,0.08)' : 'rgba(67,97,238,0.08)',
        color: done ? '#34d399' : '#4361ee',
      }}>
        {done ? 'done' : 'active'}
      </span>

      <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e2a3a', fontSize: 16, padding: '0 4px', flexShrink: 0, lineHeight: 1 }}
        onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
        onMouseLeave={e => (e.currentTarget.style.color = '#1e2a3a')}>
        ×
      </button>
    </div>
  );
}

function NewGoalModal({ companyId, goals, onClose }: { companyId: string; goals: Goal[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", description: "", parent_id: "" });

  const create = useMutation({
    mutationFn: () => api.goals.create({ ...form, company_id: companyId, parent_id: form.parent_id || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); onClose(); },
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>New goal</h2>
          <button className="btn-ghost" onClick={onClose} style={{ padding: 6 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label className="label">Title *</label><input className="input" value={form.title} onChange={set("title")} placeholder="Ship payment integrations" /></div>
          <div><label className="label">Description</label><textarea className="input" style={{ height: 72, resize: 'none' }} value={form.description} onChange={set("description")} /></div>
          <div>
            <label className="label">Parent goal</label>
            <select className="input" value={form.parent_id} onChange={set("parent_id") as React.ChangeEventHandler<HTMLSelectElement>}>
              <option value="">— Top level —</option>
              {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18, paddingTop: 14, borderTop: '1px solid #1a1f2e' }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button className="btn-primary" onClick={() => create.mutate()} disabled={!form.title || create.isPending} style={{ flex: 1, justifyContent: 'center' }}>
            {create.isPending ? 'Creating…' : 'Create goal'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Goals() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const { data: goals } = useQuery({ queryKey: ["goals"], queryFn: api.goals.list });
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: () => api.tasks.list() });
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: api.company.get });

  const tasksByGoal = new Map<string, number>();
  tasks?.forEach(t => { if (t.goal_id) tasksByGoal.set(t.goal_id, (tasksByGoal.get(t.goal_id) ?? 0) + 1); });

  const toggle = useMutation({
    mutationFn: (g: Goal) => api.goals.update(g.id, { status: g.status === "active" ? "completed" : "active" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.goals.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });

  const topLevel = goals?.filter(g => !g.parent_id) ?? [];
  const children = (id: string) => goals?.filter(g => g.parent_id === id) ?? [];
  const active = topLevel.filter(g => g.status === "active").length;
  const done = topLevel.filter(g => g.status === "completed").length;

  return (
    <div style={{ padding: '36px 40px', maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0, letterSpacing: '-0.03em' }}>Goals</h1>
          <p style={{ fontSize: 13, color: '#334155', marginTop: 5 }}>
            {active} active{done ? `, ${done} completed` : ''}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)} style={{ fontSize: 13 }}>
          <Plus size={13} /> New goal
        </button>
      </div>

      {/* Column headers */}
      {!!topLevel.length && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 8, borderBottom: '1px solid #1a1f2e' }}>
          <div style={{ width: 16, flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#2d3a52', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Goal</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#2d3a52', letterSpacing: '0.06em', textTransform: 'uppercase', width: 60, textAlign: 'right', flexShrink: 0 }}>Tasks</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#2d3a52', letterSpacing: '0.06em', textTransform: 'uppercase', width: 56, flexShrink: 0 }}>Status</div>
          <div style={{ width: 24, flexShrink: 0 }} />
        </div>
      )}

      {!topLevel.length && (
        <div style={{ textAlign: 'center', padding: '52px 0', color: '#1e2a3a', fontSize: 13 }}>
          No goals yet — create one or seed the Talix template from Dashboard.
        </div>
      )}

      {topLevel.map(g => (
        <div key={g.id}>
          <GoalRow
            goal={g}
            taskCount={tasksByGoal.get(g.id) ?? 0}
            onToggle={() => toggle.mutate(g)}
            onDelete={() => { if (confirm('Delete goal?')) del.mutate(g.id); }}
          />
          {children(g.id).map(child => (
            <GoalRow
              key={child.id}
              goal={child}
              taskCount={tasksByGoal.get(child.id) ?? 0}
              depth={1}
              onToggle={() => toggle.mutate(child)}
              onDelete={() => { if (confirm('Delete goal?')) del.mutate(child.id); }}
            />
          ))}
        </div>
      ))}

      {showNew && company && <NewGoalModal companyId={company.id} goals={goals ?? []} onClose={() => setShowNew(false)} />}
    </div>
  );
}
