import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import bcrypt from 'bcrypt';
import { Client } from 'pg';
import { authScenarios } from './auth-scenarios';
import { shopScenarios } from './shop-scenarios';
import { reviewScenarios } from './review-scenarios';
import { feedScenarios } from './feed-scenarios';
import { moderationScenarios } from './moderation-scenarios';

// These tests create and delete ONLY their own randomly named databases on local Docker.
const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl)
  throw new Error(
    'Set TEST_DATABASE_ADMIN_URL to the local Docker postgres database',
  );
const parsed = new URL(adminUrl);
assert.ok(
  ['127.0.0.1', 'localhost'].includes(parsed.hostname),
  'Tests require local Docker',
);
assert.equal(
  parsed.pathname,
  '/postgres',
  'Use the postgres maintenance database',
);
const admin = new Client({ connectionString: adminUrl });
const databases: string[] = [];
const clients: Client[] = [];
let server: ChildProcess | undefined;
const password = randomBytes(20).toString('hex');
let hash: string;
const migrations = resolve('prisma/migrations');
const dirs = readdirSync(migrations)
  .filter((name) => /^\d/.test(name))
  .sort();

async function database(label: string) {
  const name = `vero_test_${label}_${randomBytes(6).toString('hex')}`;
  assert.match(name, /^vero_test_[a-z]+_[a-f0-9]+$/);
  await admin.query(`CREATE DATABASE "${name}"`);
  databases.push(name);
  const url = new URL(adminUrl!);
  url.pathname = `/${name}`;
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  clients.push(client);
  return { name, url: url.toString(), client };
}

function command(args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
  });
  assert.equal(
    result.status,
    0,
    `${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`,
  );
  return result;
}

async function rejectsSql(
  client: Client,
  sql: string,
  values: unknown[],
  code: string,
) {
  await assert.rejects(
    client.query(sql, values),
    (error: { code?: string }) => error.code === code,
  );
}

async function testLegacy() {
  const { client } = await database('legacy');
  for (const dir of dirs.filter(
    (dir) => dir < '20261122000100_vero_foundation',
  ))
    await client.query(
      readFileSync(resolve(migrations, dir, 'migration.sql'), 'utf8'),
    );
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  for (const [index, role] of ['ADMIN', 'DEVOPS', 'VIEWER'].entries()) {
    await client.query(
      'INSERT INTO users (id,email,password_hash,full_name,role,updated_at) VALUES ($1,$2,$3,$4,$5,now())',
      [
        ids[index],
        ` Legacy${index}@Example.com `,
        hash,
        `Legacy ${role}`,
        role,
      ],
    );
  }
  const projectId = randomUUID();
  await client.query(
    "INSERT INTO projects (id,name,slug,created_by_id,updated_at) VALUES ($1,'Preserved project','preserved',$2,now())",
    [projectId, ids[1]],
  );
  const memberId = randomUUID();
  await client.query(
    "INSERT INTO project_members (id,project_id,user_id,role,updated_at) VALUES ($1,$2,$3,'OWNER',now())",
    [memberId, projectId, ids[1]],
  );
  for (const dir of dirs.filter(
    (dir) => dir >= '20261122000100_vero_foundation',
  ))
    await client.query(
      readFileSync(resolve(migrations, dir, 'migration.sql'), 'utf8'),
    );
  const rows = (
    await client.query(
      'SELECT id,email,password_hash,role FROM users ORDER BY email',
    )
  ).rows;
  assert.deepEqual(
    rows.map((r) => r.role),
    ['ADMIN', 'USER', 'USER'],
  );
  assert.deepEqual(
    rows.map((r) => r.id),
    ids,
  );
  assert.ok(rows.every((r) => r.password_hash === hash));
  assert.equal(rows[0].email, 'legacy0@example.com');
  assert.equal(
    (
      await client.query(
        'SELECT created_by_id FROM legacy_cloudops.projects WHERE id=$1',
        [projectId],
      )
    ).rows[0].created_by_id,
    ids[1],
  );
  assert.equal(
    (
      await client.query(
        'SELECT user_id FROM legacy_cloudops.project_members WHERE id=$1',
        [memberId],
      )
    ).rows[0].user_id,
    ids[1],
  );
  assert.equal(
    (
      await client.query(
        "SELECT count(*)::int AS n FROM pg_constraint WHERE connamespace='legacy_cloudops'::regnamespace AND contype='f'",
      )
    ).rows[0].n,
    14,
  );
  assert.equal(
    (
      await client.query(
        "SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='legacy_cloudops'",
      )
    ).rows[0].n,
    8,
  );
  assert.equal(
    (
      await client.query(
        "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name='projects'",
      )
    ).rows[0].n,
    0,
  );
  console.info(
    'PASS populated legacy upgrade: accounts/credentials, eight legacy tables and fourteen foreign keys preserved',
  );
}

async function testFoundation() {
  const db = await database('fresh');
  const env = {
    ...process.env,
    DATABASE_URL: db.url,
    NODE_ENV: 'development',
    SEED_ADMIN_EMAIL: 'admin@vero.invalid',
    SEED_ADMIN_PASSWORD: password,
    SEED_DEMO_DATA: 'true',
  };
  command(['node_modules/prisma/build/index.js', 'migrate', 'deploy'], env);
  command(
    [
      'node_modules/prisma/build/index.js',
      'migrate',
      'diff',
      '--from-config-datasource',
      '--to-schema',
      'prisma/schema.prisma',
      '--exit-code',
    ],
    env,
  );
  assert.equal(
    (
      await db.client.query(
        'SELECT count(*)::int AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL',
      )
    ).rows[0].n,
    dirs.length,
  );
  command(['node_modules/tsx/dist/cli.mjs', 'prisma/seed.ts'], env);
  const before = (
    await db.client.query('SELECT password_hash FROM users WHERE email=$1', [
      env.SEED_ADMIN_EMAIL,
    ])
  ).rows[0].password_hash;
  command(['node_modules/tsx/dist/cli.mjs', 'prisma/seed.ts'], env);
  assert.equal(
    (
      await db.client.query('SELECT password_hash FROM users WHERE email=$1', [
        env.SEED_ADMIN_EMAIL,
      ])
    ).rows[0].password_hash,
    before,
  );
  assert.equal(
    (await db.client.query('SELECT count(*)::int AS n FROM reviews')).rows[0].n,
    2,
  );
  const blocked = spawnSync(
    process.execPath,
    ['node_modules/tsx/dist/cli.mjs', 'prisma/seed.ts'],
    { env: { ...env, NODE_ENV: 'production' }, encoding: 'utf8' },
  );
  assert.notEqual(blocked.status, 0, 'Production seed must fail');
  const review = (await db.client.query('SELECT * FROM reviews LIMIT 1'))
    .rows[0];
  await rejectsSql(
    db.client,
    'INSERT INTO reviews (id,author_id,shop_id,submission_id,submission_hash,rating,text,updated_at) VALUES ($1,$2,$3,$4,$5,5,$6,now())',
    [
      randomUUID(),
      review.author_id,
      review.shop_id,
      review.submission_id,
      review.submission_hash,
      review.text,
    ],
    '23505',
  );
  await rejectsSql(
    db.client,
    'UPDATE reviews SET rating=6 WHERE id=$1',
    [review.id],
    '23514',
  );
  await rejectsSql(
    db.client,
    'UPDATE reviews SET text=$2 WHERE id=$1',
    [review.id, 'short'],
    '23514',
  );
  await rejectsSql(
    db.client,
    "UPDATE shops SET status='MERGED' WHERE id=$1",
    [review.shop_id],
    '23514',
  );
  await rejectsSql(
    db.client,
    'INSERT INTO reports (id,reporter_id,reason,updated_at) VALUES ($1,$2,$3,now())',
    [randomUUID(), review.author_id, 'SPAM'],
    '23514',
  );
  await rejectsSql(
    db.client,
    'INSERT INTO reports (id,reporter_id,reason,shop_id,review_id,updated_at) VALUES ($1,$2,$3,$4,$5,now())',
    [randomUUID(), review.author_id, 'SPAM', review.shop_id, review.id],
    '23514',
  );
  await db.client.query(
    'INSERT INTO reports (id,reporter_id,reason,review_id,updated_at) VALUES ($1,$2,$3,$4,now())',
    [randomUUID(), review.author_id, 'SPAM', review.id],
  );
  await rejectsSql(
    db.client,
    "INSERT INTO media_assets (id,uploader_id,storage_key,status,updated_at) VALUES ($1,$2,$3,'READY',now())",
    [randomUUID(), review.author_id, 'missing-metadata'],
    '23514',
  );
  for (let position = 0; position < 6; position++) {
    const mediaId = randomUUID();
    await db.client.query(
      "INSERT INTO media_assets (id,uploader_id,storage_key,mime_type,byte_size,width,height,status,updated_at) VALUES ($1,$2,$3,'image/jpeg',1024,100,100,'READY',now())",
      [mediaId, review.author_id, `fixture-${position}`],
    );
    const sql =
      'INSERT INTO review_images (id,review_id,media_asset_id,position) VALUES ($1,$2,$3,$4)';
    const values = [randomUUID(), review.id, mediaId, position];
    if (position < 5) await db.client.query(sql, values);
    else await rejectsSql(db.client, sql, values, '23514');
  }
  const googleId = randomUUID();
  await db.client.query(
    'INSERT INTO users (id,email,full_name,updated_at) VALUES ($1,$2,$3,now())',
    [googleId, 'google@vero.invalid', 'Google-only fixture'],
  );
  await db.client.query(
    "INSERT INTO auth_identities (id,user_id,provider,provider_subject,updated_at) VALUES ($1,$2,'GOOGLE','subject-fixture',now())",
    [randomUUID(), googleId],
  );
  await rejectsSql(
    db.client,
    "INSERT INTO auth_identities (id,user_id,provider,provider_subject,updated_at) VALUES ($1,$2,'GOOGLE','subject-fixture',now())",
    [randomUUID(), googleId],
    '23505',
  );
  const peer = new Client({ connectionString: db.url });
  await peer.connect();
  clients.push(peer);
  const duplicateKey = 'website:https://race.vero.invalid/';
  const insert =
    "INSERT INTO shop_links (id,shop_id,platform,original_url,normalized_url,identity_key,updated_at) VALUES ($1,$2,'WEBSITE',$3,$3,$4,now())";
  const race = await Promise.allSettled(
    [db.client, peer].map((c) =>
      c.query(insert, [
        randomUUID(),
        review.shop_id,
        'https://race.vero.invalid/',
        duplicateKey,
      ]),
    ),
  );
  assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(
    (race.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason
      .code,
    '23505',
  );
  const likes = await Promise.allSettled(
    [db.client, peer].map((c) =>
      c.query('INSERT INTO review_likes (user_id,review_id) VALUES ($1,$2)', [
        googleId,
        review.id,
      ]),
    ),
  );
  assert.equal(likes.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(
    (likes.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason
      .code,
    '23505',
  );
  console.info(
    'PASS fresh migration/seed, idempotent seed, production guard, repeated reviews, Google-only storage, constraints and concurrent uniqueness',
  );
  if (process.argv.includes('--http')) {
    await authScenarios(db.url);
    await shopScenarios(db.url);
    await reviewScenarios(db.url);
    await feedScenarios(db.url);
    await moderationScenarios(db.url);
    await testHttp(db.url, googleId);
    const restored=await database('restore');
    const archive=`/tmp/${db.name}.dump`;
    const docker=(args:string[])=>{const run=spawnSync('docker',['exec','vero-postgres-1',...args],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);};
    try {
      docker(['pg_dump','-U','vero','-d',db.name,'--format=custom','--no-owner','--no-acl','--file',archive]);
      docker(['pg_restore','-U','vero','-d',restored.name,'--exit-on-error','--no-owner','--no-acl',archive]);
      for(const table of ['users','reviews','reports','moderation_actions']) {
        const original=await db.client.query(`SELECT count(*)::int AS n FROM ${table}`);
        const copy=await restored.client.query(`SELECT count(*)::int AS n FROM ${table}`);
        assert.equal(copy.rows[0].n,original.rows[0].n);
      }
      console.log('PASS Docker backup/restore roundtrip: users, reviews, reports and audit records preserved');
    } finally {docker(['rm',archive]);}
  }
}

async function testHttp(databaseUrl: string, googleId: string) {
  const probe = createServer();
  await new Promise<void>((done) => probe.listen(0, '127.0.0.1', done));
  const address = probe.address();
  assert.ok(address && typeof address === 'object');
  const port = address.port;
  await new Promise<void>((done, reject) =>
    probe.close((error) => (error ? reject(error) : done())),
  );
  let logs = '';
  server = spawn(process.execPath, ['dist/main.js'], {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      PORT: String(port),
      JWT_SECRET: randomBytes(48).toString('hex'),
      NODE_ENV: 'test',
      CORS_ORIGIN: 'http://localhost:8081',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '1025',
      MAIL_FROM: 'Vero <tests@vero.invalid>',
      PASSWORD_RESET_URL: 'http://localhost:8081/reset-password',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout?.on('data', (chunk) => {
    logs += chunk.toString();
  });
  server.stderr?.on('data', (chunk) => {
    logs += chunk.toString();
  });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      ready = (await fetch(`${base}/api/health`)).ok;
    } catch {
      /* waiting for server */
    }
    if (ready || server.exitCode !== null) break;
    await delay(150);
  }
  assert.ok(ready, `API did not become healthy: ${logs}`);
  const post = (path: string, body: unknown) =>
    fetch(`${base}/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const registration = await post('/auth/register', {
    email: ' Buyer@Vero.invalid ',
    fullName: 'Test Buyer',
    password,
  });
  assert.equal(registration.status, 201);
  const account = (await registration.json()) as {
    accessToken: string;
    user: { id: string; role: string; email: string; passwordHash?: string };
  };
  assert.equal(account.user.role, 'USER');
  assert.equal(account.user.email, 'buyer@vero.invalid');
  assert.ok(!('passwordHash' in account.user));
  assert.equal(
    (
      await post('/auth/register', {
        email: 'spoof@vero.invalid',
        fullName: 'Spoof',
        password,
        role: 'ADMIN',
      })
    ).status,
    400,
  );
  const login = await post('/auth/login', {
    email: account.user.email,
    password,
  });
  assert.equal(login.status, 201);
  assert.equal(
    (
      await post('/auth/login', {
        email: 'google@vero.invalid',
        password: 'constant-time-dummy-password',
      })
    ).status,
    401,
  );
  const headers = { Authorization: `Bearer ${account.accessToken}` };
  assert.equal((await fetch(`${base}/api/auth/me`, { headers })).status, 200);
  assert.equal((await fetch(`${base}/api/users`, { headers })).status, 403);
  assert.equal((await fetch(`${base}/api/users`)).status, 401);
  const adminLogin = await post('/auth/login', {
    email: 'admin@vero.invalid',
    password,
  });
  assert.equal(adminLogin.status, 201);
  const adminToken = ((await adminLogin.json()) as { accessToken: string })
    .accessToken;
  assert.equal(
    (
      await fetch(`${base}/api/users`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    ).status,
    200,
  );
  const schema = (await (await fetch(`${base}/docs-json`)).json()) as {
    info: { title: string };
    paths: Record<string, unknown>;
  };
  assert.equal(schema.info.title, 'Vero API');
  assert.ok(schema.paths['/api/auth/register']);
  const denied = await fetch(`${base}/api/users?secret=redacted`);
  const error = (await denied.json()) as { code: string; path: string };
  assert.equal(error.code, 'UNAUTHORIZED');
  assert.equal(error.path, '/api/users');
  assert.ok(googleId); // Google-only storage is tested; actual Google login remains task 04.
  console.info(
    'PASS HTTP registration/login/profile, Google-only password rejection, USER/ADMIN authorization, public health, error codes and Vero Swagger',
  );
}

async function main() {
  hash = await bcrypt.hash(password, 12);
  await admin.connect();
  try {
    await testLegacy();
    await testFoundation();
  } finally {
    if (server && server.exitCode === null) {
      const stopped = new Promise<void>((done) =>
        server!.once('exit', () => done()),
      );
      server.kill();
      await stopped;
    }
    await Promise.all(clients.map((c) => c.end()));
    for (const name of databases) {
      assert.match(name, /^vero_test_[a-z]+_[a-f0-9]+$/);
      await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    }
    await admin.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
