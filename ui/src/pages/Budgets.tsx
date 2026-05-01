import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { api } from "../lib/api";

export default function Budgets() {
  const { data: budgets } = useQuery({ queryKey: ["budgets"], queryFn: () => api.budgets.list() });

  const totalSpent = budgets?.reduce((s, b) => s + b.spent_usd, 0) ?? 0;
  const overBudget = budgets?.filter(b => b.over_budget) ?? [];

  return (
    <div style={{ padding: '36px 40px', maxWidth: 800 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0, letterSpacing: '-0.03em' }}>Budgets</h1>
        <p style={{ fontSize: 13, color: '#334155', marginTop: 5 }}>
          Total this month: <span style={{ color: '#94a3b8', fontWeight: 600 }}>${totalSpent.toFixed(4)}</span>
        </p>
      </div>

      {overBudget.length > 0 && (
        <div style={{ marginBottom: 24, padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#f87171' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          Over budget: {overBudget.map(b => b.name).join(', ')}
        </div>
      )}

      {/* Header row */}
      {!!budgets?.length && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 8, borderBottom: '1px solid #1a1f2e', marginBottom: 0 }}>
          <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#2d3a52', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Agent</div>
          <div style={{ width: 200, fontSize: 11, fontWeight: 600, color: '#2d3a52', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Usage</div>
          <div style={{ width: 80, fontSize: 11, fontWeight: 600, color: '#2d3a52', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'right' }}>Spent</div>
          <div style={{ width: 80, fontSize: 11, fontWeight: 600, color: '#2d3a52', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'right' }}>Limit</div>
          <div style={{ width: 60, fontSize: 11, fontWeight: 600, color: '#2d3a52', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'right' }}>Tokens</div>
        </div>
      )}

      {!budgets?.length && (
        <div style={{ textAlign: 'center', padding: '52px 0', color: '#1e2a3a', fontSize: 13 }}>
          No budget data yet. Agents appear here once they run.
        </div>
      )}

      {budgets?.map(b => {
        const pct = b.budget_monthly_usd > 0 ? Math.min(100, (b.spent_usd / b.budget_monthly_usd) * 100) : 0;
        const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f97316' : '#4361ee';

        return (
          <div key={b.agent_id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 0', borderBottom: '1px solid #12161f' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13.5, color: '#cbd5e1', fontWeight: 500 }}>{b.name}</span>
                {b.over_budget && <AlertTriangle size={12} style={{ color: '#f87171' }} />}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ width: 200, flexShrink: 0 }}>
              {b.budget_monthly_usd > 0 ? (
                <div style={{ height: 4, background: '#1a1f2e', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
              ) : (
                <span style={{ fontSize: 11.5, color: '#263248' }}>No limit</span>
              )}
            </div>

            <div style={{ width: 80, textAlign: 'right', fontSize: 13, color: b.over_budget ? '#f87171' : '#475569', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
              ${b.spent_usd.toFixed(4)}
            </div>

            <div style={{ width: 80, textAlign: 'right', fontSize: 13, color: '#2d3a52', fontVariantNumeric: 'tabular-nums' }}>
              {b.budget_monthly_usd > 0 ? `$${b.budget_monthly_usd.toFixed(2)}` : '—'}
            </div>

            <div style={{ width: 60, textAlign: 'right', fontSize: 12, color: '#263248', fontVariantNumeric: 'tabular-nums' }}>
              {b.spent_tokens.toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
