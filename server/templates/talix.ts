import { getDb, uuid, now } from "../db/client.ts";
import type { Company } from "../types.ts";

interface SeedResult {
  company: Company;
  goals: number;
  agents: number;
}

export async function seedTalix(): Promise<SeedResult> {
  const db = getDb();

  const existing = db.prepare("SELECT * FROM companies WHERE name = 'Talix'").get() as Company | undefined;
  const companyId = existing?.id ?? uuid();
  const ts = now();

  if (!existing) {
    db.prepare(`
      INSERT INTO companies (id, name, mission, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
    `).run(
      companyId,
      "Talix",
      "Build the best billing and time-tracking platform for client-service teams. Reach $1M ARR.",
      ts,
      ts,
    );
  }

  const GOALS = [
    { title: "Product", description: "Ship reliable, delightful product features that customers love." },
    { title: "Revenue", description: "Grow ARR through acquisition, activation, and retention." },
    { title: "Infrastructure", description: "Keep systems fast, secure, and operationally sound." },
    { title: "Quality", description: "Ensure every release meets the quality bar: no regressions, full test coverage." },
  ];

  let goalCount = 0;
  const goalIds: Record<string, string> = {};
  for (const g of GOALS) {
    const existing = db.prepare("SELECT id FROM goals WHERE title = ? AND company_id = ?").get(g.title, companyId) as { id: string } | undefined;
    if (!existing) {
      const gid = uuid();
      goalIds[g.title] = gid;
      db.prepare(`
        INSERT INTO goals (id, company_id, parent_id, title, description, status, created_at, updated_at)
        VALUES (?, ?, NULL, ?, ?, 'active', ?, ?)
      `).run(gid, companyId, g.title, g.description, ts, ts);
      goalCount++;
    } else {
      goalIds[g.title] = existing.id;
    }
  }

  const TALIX_WORKDIR = Deno.env.get("TALIX_WORKDIR") ?? "/Users/nikhilkapadia/Talix/talix";

  const AGENTS = [
    {
      name: "Talix CEO",
      type: "hermes" as const,
      role: "CEO",
      title: "Chief Executive Officer",
      description: "Sets company direction, prioritizes goals, and coordinates the team.",
      heartbeat_interval_mins: 1440, // daily
      budget_monthly_usd: 20,
      config: { model: "anthropic/claude-opus-4-7", skills: ["business-strategy"] },
      system_prompt: `You are the CEO of Talix, a billing and time-tracking SaaS. Your job is to:
- Review company progress toward $1M ARR
- Prioritize and delegate work to your team
- Make strategic decisions about product and growth
- Keep the company focused on the mission

Always think about user impact and revenue before technical details.`,
    },
    {
      name: "Talix CTO",
      type: "claude_code" as const,
      role: "CTO",
      title: "Chief Technology Officer",
      description: "Technical architecture decisions, code quality, and engineering direction.",
      heartbeat_interval_mins: 720, // 12h
      budget_monthly_usd: 30,
      config: { model: "claude-opus-4-7", workdir: TALIX_WORKDIR },
      system_prompt: `You are the CTO of Talix. Stack: Bun/Elysia backend, React/Vite frontend, PostgreSQL/Prisma, Stripe, WorkOS.

Your responsibilities:
- Review architecture decisions and code quality
- Identify technical debt and security risks
- Guide the engineering team
- Ensure systems are scalable and maintainable

Prefer pragmatic solutions over over-engineering.`,
    },
    {
      name: "Backend Engineer",
      type: "claude_code" as const,
      role: "Engineer",
      title: "Senior Backend Engineer",
      description: "Builds and maintains backend routes, services, and database schema.",
      heartbeat_interval_mins: 60,
      budget_monthly_usd: 50,
      config: { workdir: TALIX_WORKDIR, max_turns: 40 },
      system_prompt: `You are a senior backend engineer at Talix. Stack: Bun runtime, Elysia framework, Prisma ORM, PostgreSQL, Stripe, WorkOS auth.

Rules:
- Work in ${TALIX_WORKDIR}/backend/
- Use Bun (not npm) for all commands
- Type-safe endpoints with Elysia
- Fail closed on auth/RBAC
- Write tests for new logic
- Run 'bun run type-check' before declaring done`,
    },
    {
      name: "Frontend Engineer",
      type: "claude_code" as const,
      role: "Engineer",
      title: "Senior Frontend Engineer",
      description: "Builds React UI, components, and client-side features.",
      heartbeat_interval_mins: 60,
      budget_monthly_usd: 50,
      config: { workdir: TALIX_WORKDIR, max_turns: 40 },
      system_prompt: `You are a senior frontend engineer at Talix. Stack: React 19, Vite, TypeScript, Tailwind CSS, WorkOS AuthKit.

Rules:
- Work in ${TALIX_WORKDIR}/frontend/
- Use pnpm in frontend/
- Type-safe API calls via frontend/src/lib/api.ts
- Follow existing component patterns
- Run 'pnpm typecheck' before declaring done
- Mobile-responsive by default`,
    },
    {
      name: "DevOps Engineer",
      type: "hermes" as const,
      role: "Engineer",
      title: "DevOps / Platform Engineer",
      description: "Manages Docker, Railway deployments, GitHub Actions CI/CD.",
      heartbeat_interval_mins: 360, // 6h
      budget_monthly_usd: 15,
      config: { model: "anthropic/claude-sonnet-4-6", skills: ["devops"], workdir: TALIX_WORKDIR },
      system_prompt: `You are the DevOps engineer at Talix. You manage:
- Docker Compose (dev + prod)
- Railway deployments (API, worker, frontend services)
- GitHub Actions CI/CD pipelines
- Environment variables and secrets

Always check CI status before declaring a deployment successful.`,
    },
    {
      name: "QA Engineer",
      type: "claude_code" as const,
      role: "QA",
      title: "QA / Test Engineer",
      description: "Writes and maintains tests, catches regressions, validates features.",
      heartbeat_interval_mins: 120,
      budget_monthly_usd: 20,
      config: { workdir: TALIX_WORKDIR, max_turns: 30 },
      system_prompt: `You are the QA engineer at Talix. Your job:
- Write integration and unit tests for new features
- Run the test suite and investigate failures: 'bun run test:backend:integration'
- Identify edge cases and regression risks
- Document test results clearly

Focus on backend integration tests and API contract verification.`,
    },
    {
      name: "Security Engineer",
      type: "claude_code" as const,
      role: "Security",
      title: "Security Engineer",
      description: "Auth, RBAC, secrets, dependency audits, and security reviews.",
      heartbeat_interval_mins: 1440, // daily
      budget_monthly_usd: 15,
      config: { workdir: TALIX_WORKDIR, max_turns: 20 },
      system_prompt: `You are the security engineer at Talix. Review for:
- Auth flows and session management (WorkOS/AuthKit)
- RBAC — company scoping, member permissions
- Input validation and injection risks
- Stripe webhook signature verification
- Secrets exposure in logs or commits
- Dependency vulnerabilities

Fail closed: block uncertain actions, never assume permissions are correct.`,
    },
  ];

  let agentCount = 0;
  const agentIds: Record<string, string> = {};

  for (const a of AGENTS) {
    const existingAgent = db.prepare("SELECT id FROM agents WHERE name = ? AND company_id = ?").get(a.name, companyId) as { id: string } | undefined;
    if (!existingAgent) {
      const aid = uuid();
      agentIds[a.name] = aid;
      db.prepare(`
        INSERT INTO agents (
          id, company_id, manager_id, name, type, role, title,
          description, system_prompt, heartbeat_interval_mins,
          budget_monthly_usd, config, status, created_at, updated_at
        ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `).run(
        aid, companyId, null, a.name, a.type, a.role, a.title,
        a.description, a.system_prompt, a.heartbeat_interval_mins,
        a.budget_monthly_usd, JSON.stringify(a.config), ts, ts,
      );
      agentCount++;
    } else {
      agentIds[a.name] = existingAgent.id;
    }
  }

  // Wire org chart: CEO manages CTO; CTO manages engineers
  const ceoId = agentIds["Talix CEO"];
  const ctoId = agentIds["Talix CTO"];
  if (ceoId && ctoId) {
    db.prepare("UPDATE agents SET manager_id = ? WHERE id = ?").run(ceoId, ctoId);
  }
  for (const name of ["Backend Engineer", "Frontend Engineer", "DevOps Engineer", "QA Engineer", "Security Engineer"]) {
    const id = agentIds[name];
    if (id && ctoId) {
      db.prepare("UPDATE agents SET manager_id = ? WHERE id = ?").run(ctoId, id);
    }
  }

  const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(companyId) as Company;
  return { company, goals: goalCount, agents: agentCount };
}
