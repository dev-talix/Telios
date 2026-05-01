import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Bot, CheckSquare, Target, DollarSign, GitBranch, Zap, Activity } from "lucide-react";
import { api } from "./lib/api";
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import Tasks from "./pages/Tasks";
import Goals from "./pages/Goals";
import Budgets from "./pages/Budgets";
import OrgChart from "./pages/OrgChart";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/agents", icon: Bot, label: "Agents" },
  { to: "/tasks", icon: CheckSquare, label: "Tasks" },
  { to: "/goals", icon: Target, label: "Goals" },
  { to: "/org", icon: GitBranch, label: "Org Chart" },
  { to: "/budgets", icon: DollarSign, label: "Budgets" },
];

function Sidebar() {
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: api.company.get });
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: api.stats, refetchInterval: 15_000 });

  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      borderRight: '1px solid #1a1f2e',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      background: '#090b10',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #1a1f2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #4361ee, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
            boxShadow: '0 4px 12px rgba(67,97,238,0.4)',
          }}>🎯</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Telos</div>
            <div style={{ fontSize: 11, color: '#3d4f6e', marginTop: 1, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {company?.name ?? 'No company'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === "/"} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 10px', borderRadius: 8,
            fontSize: 13.5, fontWeight: 500,
            textDecoration: 'none',
            transition: 'all 0.15s',
            background: isActive ? 'rgba(67,97,238,0.12)' : 'transparent',
            color: isActive ? '#818cf8' : '#64748b',
            borderLeft: isActive ? '2px solid #4361ee' : '2px solid transparent',
          })}>
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Live stats */}
      {stats && (
        <div style={{ padding: '12px 12px', borderTop: '1px solid #1a1f2e' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#3d4f6e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Live</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#475569' }}>Agents</span>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>{stats.agents}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#475569' }}>Running</span>
              <span style={{ color: stats.tasks_running > 0 ? '#22c55e' : '#94a3b8', fontWeight: 600 }}>{stats.tasks_running}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#475569' }}>Cost today</span>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>${stats.cost_today.toFixed(3)}</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '10px 12px', borderTop: '1px solid #1a1f2e' }}>
        <div style={{ fontSize: 10, color: '#1e2a3a', fontFamily: 'monospace' }}>telos v0.1.0</div>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{
          flex: 1, overflow: 'auto', minWidth: 0,
          backgroundImage: 'radial-gradient(circle, rgba(67,97,238,0.18) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/org" element={<OrgChart />} />
            <Route path="/budgets" element={<Budgets />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
