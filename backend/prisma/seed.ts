import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const IDS = {
  users: {
    admin: '10000000-0000-4000-8000-000000000001',
    devops: '10000000-0000-4000-8000-000000000002',
    viewer: '10000000-0000-4000-8000-000000000003',
  },
  projects: {
    alpha: '20000000-0000-4000-8000-000000000001',
    beta: '20000000-0000-4000-8000-000000000002',
  },
  servers: [
    '30000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000004',
    '30000000-0000-4000-8000-000000000005',
    '30000000-0000-4000-8000-000000000006',
  ],
  rules: [
    '40000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000003',
  ],
  alerts: [
    '50000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000003',
    '50000000-0000-4000-8000-000000000004',
  ],
};

const requiredPassword = (key: string, fallback: string) =>
  process.env[key] || fallback;

async function main() {
  const passwordRows = [
    {
      id: IDS.users.admin,
      email: 'admin@cloudops.dev',
      fullName: 'CloudOps Admin',
      role: 'ADMIN' as const,
      password: requiredPassword('SEED_ADMIN_PASSWORD', 'AdminDev123'),
    },
    {
      id: IDS.users.devops,
      email: 'devops@cloudops.dev',
      fullName: 'CloudOps DevOps',
      role: 'DEVOPS' as const,
      password: requiredPassword('SEED_DEVOPS_PASSWORD', 'DevopsDev123'),
    },
    {
      id: IDS.users.viewer,
      email: 'viewer@cloudops.dev',
      fullName: 'CloudOps Viewer',
      role: 'VIEWER' as const,
      password: requiredPassword('SEED_VIEWER_PASSWORD', 'ViewerDev123'),
    },
  ];

  const users: Record<string, { id: string }> = {};
  for (const row of passwordRows) {
    const passwordHash = await bcrypt.hash(row.password, 12);
    const user = await prisma.user.upsert({
      where: { email: row.email },
      update: {
        fullName: row.fullName,
        role: row.role,
        isActive: true,
        passwordHash,
      },
      create: {
        id: row.id,
        email: row.email,
        fullName: row.fullName,
        role: row.role,
        passwordHash,
      },
      select: { id: true },
    });
    users[row.email] = user;
  }

  const projects = [
    {
      id: IDS.projects.alpha,
      name: 'CloudOps Platform',
      slug: 'cloudops-platform',
      description: 'Core CloudOps management platform',
      createdById: users['admin@cloudops.dev'].id,
    },
    {
      id: IDS.projects.beta,
      name: 'Analytics Platform',
      slug: 'analytics-platform',
      description: 'Analytics and reporting services',
      createdById: users['devops@cloudops.dev'].id,
    },
  ];

  for (const project of projects) {
    await prisma.project.upsert({
      where: { slug: project.slug },
      update: {
        name: project.name,
        description: project.description,
        status: 'ACTIVE',
        createdById: project.createdById,
      },
      create: project,
    });
  }

  const projectIds = {
    alpha: (
      await prisma.project.findUniqueOrThrow({
        where: { slug: 'cloudops-platform' },
        select: { id: true },
      })
    ).id,
    beta: (
      await prisma.project.findUniqueOrThrow({
        where: { slug: 'analytics-platform' },
        select: { id: true },
      })
    ).id,
  };

  const membershipRows = [
    {
      projectId: projectIds.alpha,
      userId: users['admin@cloudops.dev'].id,
      role: 'OWNER' as const,
    },
    {
      projectId: projectIds.alpha,
      userId: users['devops@cloudops.dev'].id,
      role: 'MEMBER' as const,
    },
    {
      projectId: projectIds.beta,
      userId: users['devops@cloudops.dev'].id,
      role: 'OWNER' as const,
    },
    {
      projectId: projectIds.beta,
      userId: users['viewer@cloudops.dev'].id,
      role: 'MEMBER' as const,
    },
  ];

  for (const member of membershipRows) {
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: member.projectId,
          userId: member.userId,
        },
      },
      update: { role: member.role },
      create: member,
    });
  }

  const environmentRows = [
    {
      projectId: projectIds.alpha,
      type: 'DEV' as const,
      name: 'Development',
      url: 'https://dev.cloudops.local',
    },
    {
      projectId: projectIds.alpha,
      type: 'STAGING' as const,
      name: 'Staging',
      url: 'https://staging.cloudops.local',
    },
    {
      projectId: projectIds.alpha,
      type: 'PROD' as const,
      name: 'Production',
      url: 'https://cloudops.example.com',
    },
    {
      projectId: projectIds.beta,
      type: 'DEV' as const,
      name: 'Development',
      url: 'https://analytics-dev.example.com',
    },
    {
      projectId: projectIds.beta,
      type: 'STAGING' as const,
      name: 'Staging',
      url: 'https://analytics-staging.example.com',
    },
    {
      projectId: projectIds.beta,
      type: 'PROD' as const,
      name: 'Production',
      url: 'https://analytics.example.com',
    },
  ];

  const envMap = new Map<string, string>();
  for (const env of environmentRows) {
    const saved = await prisma.environment.upsert({
      where: { projectId_type: { projectId: env.projectId, type: env.type } },
      update: { name: env.name, url: env.url },
      create: env,
      select: { id: true, projectId: true, type: true },
    });
    envMap.set(`${saved.projectId}:${saved.type}`, saved.id);
  }

  const serverRows = [
    {
      id: IDS.servers[0],
      name: 'aws-prod-api-01',
      ipAddress: '10.10.1.11',
      provider: 'AWS' as const,
      region: 'us-east-1',
      cpuCores: 8,
      ramGb: 32,
      storageGb: 500,
      status: 'ONLINE' as const,
      projectId: projectIds.alpha,
      environmentId: envMap.get(`${projectIds.alpha}:PROD`)!,
    },
    {
      id: IDS.servers[1],
      name: 'aws-staging-api-01',
      ipAddress: '10.10.2.11',
      provider: 'AWS' as const,
      region: 'us-east-2',
      cpuCores: 4,
      ramGb: 16,
      storageGb: 250,
      status: 'ONLINE' as const,
      projectId: projectIds.alpha,
      environmentId: envMap.get(`${projectIds.alpha}:STAGING`)!,
    },
    {
      id: IDS.servers[2],
      name: 'azure-dev-worker-01',
      ipAddress: '10.20.1.21',
      provider: 'AZURE' as const,
      region: 'westeurope',
      cpuCores: 4,
      ramGb: 16,
      storageGb: 256,
      status: 'ONLINE' as const,
      projectId: projectIds.alpha,
      environmentId: envMap.get(`${projectIds.alpha}:DEV`)!,
    },
    {
      id: IDS.servers[3],
      name: 'gcp-prod-analytics-01',
      ipAddress: '10.30.1.31',
      provider: 'GCP' as const,
      region: 'europe-west1',
      cpuCores: 16,
      ramGb: 64,
      storageGb: 1000,
      status: 'ONLINE' as const,
      projectId: projectIds.beta,
      environmentId: envMap.get(`${projectIds.beta}:PROD`)!,
    },
    {
      id: IDS.servers[4],
      name: 'do-staging-web-01',
      ipAddress: '10.40.2.41',
      provider: 'DIGITALOCEAN' as const,
      region: 'fra1',
      cpuCores: 2,
      ramGb: 8,
      storageGb: 160,
      status: 'ONLINE' as const,
      projectId: projectIds.beta,
      environmentId: envMap.get(`${projectIds.beta}:STAGING`)!,
    },
    {
      id: IDS.servers[5],
      name: 'onprem-dev-db-01',
      ipAddress: '10.50.1.51',
      provider: 'ON_PREMISES' as const,
      region: 'tunis-dc1',
      cpuCores: 8,
      ramGb: 32,
      storageGb: 2000,
      status: 'MAINTENANCE' as const,
      projectId: projectIds.beta,
      environmentId: envMap.get(`${projectIds.beta}:DEV`)!,
    },
  ];

  for (const server of serverRows) {
    await prisma.server.upsert({
      where: { ipAddress: server.ipAddress },
      update: { ...server },
      create: server,
    });
  }

  const applicationRows = [
    {
      name: 'cloudops-api',
      serverIndex: 0,
      repoUrl: 'https://github.com/NestCloudOps/cloudops-api',
      status: 'RUNNING' as const,
    },
    {
      name: 'cloudops-web',
      serverIndex: 0,
      repoUrl: 'https://github.com/NestCloudOps/cloudops-web',
      status: 'RUNNING' as const,
    },
    {
      name: 'cloudops-worker',
      serverIndex: 1,
      repoUrl: 'https://github.com/NestCloudOps/cloudops-worker',
      status: 'RUNNING' as const,
    },
    {
      name: 'cloudops-auth',
      serverIndex: 2,
      repoUrl: 'https://github.com/NestCloudOps/cloudops-auth',
      status: 'RUNNING' as const,
    },
    {
      name: 'analytics-api',
      serverIndex: 3,
      repoUrl: 'https://github.com/NestCloudOps/analytics-api',
      status: 'RUNNING' as const,
    },
    {
      name: 'analytics-etl',
      serverIndex: 3,
      repoUrl: 'https://github.com/NestCloudOps/analytics-etl',
      status: 'RUNNING' as const,
    },
    {
      name: 'analytics-dashboard',
      serverIndex: 4,
      repoUrl: 'https://github.com/NestCloudOps/analytics-dashboard',
      status: 'RUNNING' as const,
    },
    {
      name: 'reporting-worker',
      serverIndex: 4,
      repoUrl: 'https://github.com/NestCloudOps/reporting-worker',
      status: 'STOPPED' as const,
    },
    {
      name: 'postgres-exporter',
      serverIndex: 5,
      repoUrl: 'https://github.com/prometheus-community/postgres_exporter',
      status: 'RUNNING' as const,
    },
    {
      name: 'backup-agent',
      serverIndex: 5,
      repoUrl: 'https://github.com/NestCloudOps/backup-agent',
      status: 'RUNNING' as const,
    },
  ];

  for (const app of applicationRows) {
    const server = serverRows[app.serverIndex];
    const environmentId = server.environmentId;
    await prisma.application.upsert({
      where: { serverId_name: { serverId: server.id, name: app.name } },
      update: {
        repoUrl: app.repoUrl,
        status: app.status,
        projectId: server.projectId,
        environmentId,
      },
      create: {
        name: app.name,
        repoUrl: app.repoUrl,
        status: app.status,
        serverId: server.id,
        projectId: server.projectId,
        environmentId,
      },
    });
  }

  const ruleRows = [
    {
      id: IDS.rules[0],
      name: 'CPU usage above 85%',
      metricType: 'CPU' as const,
      operator: 'GT' as const,
      threshold: 85,
      severity: 'HIGH' as const,
      consecutiveBreaches: 2,
      enabled: true,
    },
    {
      id: IDS.rules[1],
      name: 'RAM usage above 90%',
      metricType: 'RAM' as const,
      operator: 'GT' as const,
      threshold: 90,
      severity: 'CRITICAL' as const,
      consecutiveBreaches: 2,
      enabled: true,
    },
    {
      id: IDS.rules[2],
      name: 'Disk usage above 80%',
      metricType: 'DISK' as const,
      operator: 'GT' as const,
      threshold: 80,
      severity: 'MEDIUM' as const,
      consecutiveBreaches: 3,
      enabled: true,
    },
  ];

  for (const rule of ruleRows) {
    await prisma.alertRule.upsert({
      where: { id: rule.id },
      update: rule,
      create: rule,
    });
  }

  const alertRows = [
    {
      id: IDS.alerts[0],
      serverId: serverRows[0].id,
      ruleId: IDS.rules[0],
      message: 'CPU usage exceeded 85% on aws-prod-api-01',
      metricValue: 91.2,
      severity: 'HIGH' as const,
      status: 'OPEN' as const,
      triggeredAt: new Date(Date.now() - 45 * 60_000),
    },
    {
      id: IDS.alerts[1],
      serverId: serverRows[3].id,
      ruleId: IDS.rules[1],
      message: 'RAM usage exceeded 90% on gcp-prod-analytics-01',
      metricValue: 94.5,
      severity: 'CRITICAL' as const,
      status: 'ACKNOWLEDGED' as const,
      triggeredAt: new Date(Date.now() - 4 * 60 * 60_000),
      acknowledgedAt: new Date(Date.now() - 3 * 60 * 60_000),
      acknowledgedById: users['admin@cloudops.dev'].id,
    },
    {
      id: IDS.alerts[2],
      serverId: serverRows[4].id,
      ruleId: IDS.rules[2],
      message: 'Disk usage exceeded 80% on do-staging-web-01',
      metricValue: 83.1,
      severity: 'MEDIUM' as const,
      status: 'RESOLVED' as const,
      triggeredAt: new Date(Date.now() - 20 * 60 * 60_000),
      resolvedAt: new Date(Date.now() - 18 * 60 * 60_000),
    },
    {
      id: IDS.alerts[3],
      serverId: serverRows[5].id,
      ruleId: null,
      message: 'Server onprem-dev-db-01 is unreachable',
      metricValue: null,
      severity: 'CRITICAL' as const,
      status: 'OPEN' as const,
      triggeredAt: new Date(Date.now() - 15 * 60_000),
    },
  ];

  for (const alert of alertRows) {
    await prisma.alert.upsert({
      where: { id: alert.id },
      update: alert,
      create: alert,
    });
  }

  // Fixed UTC-day window: rerunning the seed on the same day does not create duplicate samples.
  const now = new Date();
  const dayAnchor = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const start = dayAnchor.getTime() - 24 * 60 * 60_000;
  const metrics: {
    serverId: string;
    cpuUsage: number;
    ramUsage: number;
    diskUsage: number;
    isUp: boolean;
    recordedAt: Date;
  }[] = [];

  for (let s = 0; s < serverRows.length; s++) {
    let cpu = 25 + Math.random() * 35;
    let ram = 30 + Math.random() * 30;
    let disk = 35 + Math.random() * 25;

    for (let i = 0; i < 288; i++) {
      const recordedAt = new Date(start + i * 5 * 60_000);
      cpu = Math.max(5, Math.min(95, cpu + (Math.random() - 0.5) * 8));
      ram = Math.max(5, Math.min(95, ram + (Math.random() - 0.5) * 4));
      disk = Math.max(5, Math.min(95, disk + (Math.random() - 0.5) * 1.5));
      const isUp = Math.random() > 0.012;
      metrics.push({
        serverId: serverRows[s].id,
        cpuUsage: Number((isUp ? cpu : 0).toFixed(2)),
        ramUsage: Number((isUp ? ram : 0).toFixed(2)),
        diskUsage: Number((isUp ? disk : 0).toFixed(2)),
        isUp,
        recordedAt,
      });
    }
  }

  const batchSize = 500;
  for (let i = 0; i < metrics.length; i += batchSize) {
    await prisma.metric.createMany({
      data: metrics.slice(i, i + batchSize),
      skipDuplicates: true,
    });
  }

  console.log('B2 seed completed.');
  console.log('Users: 3 | Projects: 2 | Members: 4 | Environments: 6');
  console.log(
    'Servers: 6 | Applications: 10 | Metrics: 1728 | Rules: 3 | Alerts: 4',
  );
}

main()
  .catch((error: unknown) => {
    console.error('B2 seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
