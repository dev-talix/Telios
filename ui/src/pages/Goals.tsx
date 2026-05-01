import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Target, CheckCircle } from "lucide-react";
import { api, type Goal } from "../lib/api";

function GoalRow({ goal, tasks, children, onToggle, onDelete }: {
  goal: Goal;
  tasks: number;
  children?: React.ReactNode;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="card flex items-start gap-3 group">
        <div className={`mt-0.5 p-1.5 rounded-lg ${goal.status === "completed" ? "bg-green-900" : "bg-brand-500/10"}`}>
          {goal.status === "completed"
            ? <CheckCircle size={14} className="text-green-400" />
            : <Target size={14} className="text-brand-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm ${goal.status === "completed" ? "line-through text-gray-500" : "text-white"}`}>{goal.title}</span>
            {tasks > 0 && <span className="badge bg-gray-800 text-gray-400">{tasks} tasks</span>}
          </div>
          {goal.description && <p className="text-xs text-gray-500 mt-0.5">{goal.description}</p>}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="btn-ghost text-xs" onClick={onToggle}>
            {goal.status === "active" ? "Complete" : "Reopen"}
          </button>
          <button className="btn-danger text-xs" onClick={onDelete}>×</button>
        </div>
      </div>
      {children && <div className="ml-8 space-y-2">{children}</div>}
    </div>
  );
}

function NewGoalModal({ companyId, goals, onClose }: { companyId: string; goals: Goal[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", description: "", parent_id: "" });

  const create = useMutation({
    mutationFn: () => api.goals.create({
      ...form,
      company_id: companyId,
      parent_id: form.parent_id || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); onClose(); },
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="font-semibold text-white">New goal</h2>
        <div><label className="label">Title *</label><input className="input" value={form.title} onChange={set("title")} placeholder="Ship payment integrations" /></div>
        <div><label className="label">Description</label><textarea className="input h-20 resize-none" value={form.description} onChange={set("description")} /></div>
        <div>
          <label className="label">Parent goal</label>
          <select className="input" value={form.parent_id} onChange={set("parent_id") as React.ChangeEventHandler<HTMLSelectElement>}>
            <option value="">— Top level —</option>
            {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </div>
        <div className="flex gap-2 pt-2">
          <button className="btn-ghost flex-1 justify-center" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1 justify-center" onClick={() => create.mutate()} disabled={!form.title || create.isPending}>
            {create.isPending ? "Creating…" : "Create goal"}
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
  tasks?.forEach((t) => { if (t.goal_id) tasksByGoal.set(t.goal_id, (tasksByGoal.get(t.goal_id) ?? 0) + 1); });

  const toggle = useMutation({
    mutationFn: (g: Goal) => api.goals.update(g.id, { status: g.status === "active" ? "completed" : "active" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.goals.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });

  const topLevel = goals?.filter((g) => !g.parent_id) ?? [];
  const children = (parentId: string) => goals?.filter((g) => g.parent_id === parentId) ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Goals</h1>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={14} /> New goal
        </button>
      </div>

      {!topLevel.length && (
        <div className="card text-center py-12 text-gray-500">
          <Target size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No goals yet. Seed the Talix template or create one.</p>
        </div>
      )}

      <div className="space-y-3">
        {topLevel.map((g) => (
          <GoalRow
            key={g.id}
            goal={g}
            tasks={tasksByGoal.get(g.id) ?? 0}
            onToggle={() => toggle.mutate(g)}
            onDelete={() => { if (confirm("Delete goal?")) del.mutate(g.id); }}
          >
            {children(g.id).map((child) => (
              <GoalRow
                key={child.id}
                goal={child}
                tasks={tasksByGoal.get(child.id) ?? 0}
                onToggle={() => toggle.mutate(child)}
                onDelete={() => { if (confirm("Delete goal?")) del.mutate(child.id); }}
              />
            ))}
          </GoalRow>
        ))}
      </div>

      {showNew && company && <NewGoalModal companyId={company.id} goals={goals ?? []} onClose={() => setShowNew(false)} />}
    </div>
  );
}
