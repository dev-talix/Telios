import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { api } from "../lib/api";

function BudgetBar({ spent, total }: { spent: number; total: number }) {
  if (total <= 0) return <span className="text-xs text-gray-600">No limit</span>;
  const pct = Math.min(100, (spent / total) * 100);
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-brand-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>${spent.toFixed(3)} spent</span>
        <span>${total.toFixed(2)} limit</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Budgets() {
  const { data: budgets } = useQuery({ queryKey: ["budgets"], queryFn: () => api.budgets.list() });

  const overBudget = budgets?.filter((b) => b.over_budget) ?? [];
  const totalSpent = budgets?.reduce((s, b) => s + b.spent_usd, 0) ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Budgets</h1>
        <div className="text-sm text-gray-400">
          Total this month: <span className="text-white font-semibold">${totalSpent.toFixed(3)}</span>
        </div>
      </div>

      {overBudget.length > 0 && (
        <div className="card border-red-800 bg-red-950/30">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle size={14} />
            {overBudget.length} agent{overBudget.length > 1 ? "s are" : " is"} over budget: {overBudget.map((b) => b.name).join(", ")}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {budgets?.map((b) => (
          <div key={b.agent_id} className={`card space-y-3 ${b.over_budget ? "border-red-800" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-white">{b.name}</span>
              {b.over_budget && <AlertTriangle size={14} className="text-red-400" />}
            </div>
            <BudgetBar spent={b.spent_usd} total={b.budget_monthly_usd} />
            <div className="text-xs text-gray-600">
              {b.spent_tokens.toLocaleString()} tokens · period {b.period ?? "current"}
            </div>
          </div>
        ))}
      </div>

      {!budgets?.length && (
        <div className="card text-center py-12 text-gray-500">
          <p className="text-sm">No budget data yet. Agents will appear here once they start running.</p>
        </div>
      )}
    </div>
  );
}
