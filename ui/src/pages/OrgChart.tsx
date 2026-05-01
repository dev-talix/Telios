import { useQuery } from "@tanstack/react-query";
import { Bot, Terminal } from "lucide-react";
import { api, type Agent } from "../lib/api";

const TYPE_ICONS: Record<string, React.ElementType> = {
  hermes: Bot,
  claude_code: Terminal,
  http: Bot,
};

const STATUS_COLORS: Record<string, string> = {
  active: "border-green-500",
  paused: "border-yellow-500",
  terminated: "border-gray-600",
};

function AgentNode({ agent }: { agent: Agent }) {
  const Icon = TYPE_ICONS[agent.type] ?? Bot;
  return (
    <div className={`bg-gray-900 border-2 ${STATUS_COLORS[agent.status]} rounded-xl p-4 w-48 flex-shrink-0`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-gray-800 rounded-lg">
          <Icon size={14} className="text-brand-400" />
        </div>
        <span className="text-xs font-semibold text-white truncate">{agent.name}</span>
      </div>
      <div className="text-xs text-gray-500">{agent.title ?? agent.role}</div>
      <div className="text-xs text-gray-600 mt-0.5">{agent.type}</div>
      {agent.budget_monthly_usd > 0 && (
        <div className="text-xs text-gray-600 mt-1">${agent.budget_monthly_usd}/mo</div>
      )}
    </div>
  );
}

function OrgLevel({ agents, managerId, allAgents }: {
  agents: Agent[];
  managerId: string | null;
  allAgents: Agent[];
}) {
  const levelAgents = agents.filter((a) => a.manager_id === managerId);
  if (!levelAgents.length) return null;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-6 flex-wrap justify-center">
        {levelAgents.map((agent) => {
          const hasReports = agents.some((a) => a.manager_id === agent.id);
          return (
            <div key={agent.id} className="flex flex-col items-center gap-3">
              <AgentNode agent={agent} />
              {hasReports && (
                <div className="w-px h-6 bg-gray-700" />
              )}
              {hasReports && (
                <OrgLevel agents={allAgents} managerId={agent.id} allAgents={allAgents} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrgChart() {
  const { data: agents } = useQuery({ queryKey: ["agents"], queryFn: api.agents.list });

  const active = agents?.filter((a) => a.status !== "terminated") ?? [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-white">Org Chart</h1>

      {!active.length && (
        <div className="card text-center py-12 text-gray-500">
          <Bot size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No agents yet.</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-fit py-6">
          <OrgLevel agents={active} managerId={null} allAgents={active} />
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-t-2 border-green-500 inline-block" /> Active</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-t-2 border-yellow-500 inline-block" /> Paused</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-t-2 border-gray-600 inline-block" /> Terminated</span>
      </div>
    </div>
  );
}
