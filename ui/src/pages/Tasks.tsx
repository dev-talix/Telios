import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Unlock } from "lucide-react";
import { api, type Task } from "../lib/api";

const COLUMNS: { status: Task["status"]; label: string; color: string }[] = [
  { status: "todo", label: "To Do", color: "text-gray-400" },
  { status: "in_progress", label: "In Progress", color: "text-blue-400" },
  { status: "done", label: "Done", color: "text-green-400" },
  { status: "blocked", label: "Blocked", color: "text-red-400" },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-900 text-red-300",
  high: "bg-orange-900 text-orange-300",
  normal: "bg-gray-800 text-gray-400",
  low: "bg-gray-800 text-gray-600",
};

function TaskCard({ task, agents, onRelease, onMove, onDelete }: {
  task: Task;
  agents: Map<string, string>;
  onRelease: () => void;
  onMove: (status: Task["status"]) => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2 group">
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-medium text-gray-200 leading-snug">{task.title}</p>
        <button className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-opacity flex-shrink-0" onClick={onDelete}>×</button>
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 leading-relaxed">{task.description.slice(0, 100)}{task.description.length > 100 ? "…" : ""}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
        {task.assignee_id && (
          <span className="badge bg-brand-500/10 text-brand-400">{agents.get(task.assignee_id) ?? "?"}</span>
        )}
        {task.checkout_run_id && (
          <button className="badge bg-yellow-900 text-yellow-300 cursor-pointer hover:bg-yellow-800" onClick={onRelease}>
            <Unlock size={10} className="mr-1" /> locked
          </button>
        )}
      </div>

      <div className="flex gap-1 pt-1">
        {COLUMNS.filter((c) => c.status !== task.status).map((c) => (
          <button key={c.status} className="text-xs text-gray-600 hover:text-gray-400 transition-colors" onClick={() => onMove(c.status)}>
            → {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function NewTaskModal({ companyId, agents, goals, onClose }: {
  companyId: string;
  agents: { id: string; name: string }[];
  goals: { id: string; title: string }[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<{ title: string; description: string; priority: Task["priority"]; assignee_id: string; goal_id: string }>({ title: "", description: "", priority: "normal", assignee_id: "", goal_id: "" });

  const create = useMutation({
    mutationFn: () => api.tasks.create({
      ...form,
      company_id: companyId,
      assignee_id: form.assignee_id || undefined,
      goal_id: form.goal_id || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); onClose(); },
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="font-semibold text-white">New task</h2>

        <div><label className="label">Title *</label><input className="input" value={form.title} onChange={set("title")} placeholder="Build invoice PDF export" /></div>
        <div><label className="label">Description</label><textarea className="input h-20 resize-none" value={form.description} onChange={set("description")} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={set("priority") as React.ChangeEventHandler<HTMLSelectElement>}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="label">Assignee</label>
            <select className="input" value={form.assignee_id} onChange={set("assignee_id") as React.ChangeEventHandler<HTMLSelectElement>}>
              <option value="">— Unassigned —</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Goal</label>
            <select className="input" value={form.goal_id} onChange={set("goal_id") as React.ChangeEventHandler<HTMLSelectElement>}>
              <option value="">— None —</option>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button className="btn-ghost flex-1 justify-center" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1 justify-center" onClick={() => create.mutate()} disabled={!form.title || create.isPending}>
            {create.isPending ? "Creating…" : "Create task"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Tasks() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: () => api.tasks.list() });
  const { data: agents } = useQuery({ queryKey: ["agents"], queryFn: api.agents.list });
  const { data: goals } = useQuery({ queryKey: ["goals"], queryFn: api.goals.list });
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: api.company.get });

  const agentMap = new Map(agents?.map((a) => [a.id, a.name]) ?? []);

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

  const tasksByStatus = (status: Task["status"]) => tasks?.filter((t) => t.status === status) ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Tasks</h1>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={14} /> New task
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 min-h-96">
        {COLUMNS.map(({ status, label, color }) => (
          <div key={status} className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <h2 className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{label}</h2>
              <span className="text-xs text-gray-600">{tasksByStatus(status).length}</span>
            </div>
            {tasksByStatus(status).map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                agents={agentMap}
                onRelease={() => release.mutate(t.id)}
                onMove={(s) => move.mutate({ id: t.id, status: s })}
                onDelete={() => { if (confirm("Delete task?")) del.mutate(t.id); }}
              />
            ))}
          </div>
        ))}
      </div>

      {showNew && company && (
        <NewTaskModal
          companyId={company.id}
          agents={agents ?? []}
          goals={goals ?? []}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  );
}
