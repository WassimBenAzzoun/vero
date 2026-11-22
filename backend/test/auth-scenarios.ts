import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { AuthService } from '../src/auth/auth.service';
import { SessionsService } from '../src/auth/sessions.service';
import { GoogleService } from '../src/auth/google.service';
import { RecoveryService } from '../src/auth/recovery.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { tokenHash } from '../src/auth/sessions.service';

export async function authScenarios(url: string) {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const prisma = db as unknown as PrismaService;
  const jwt = new JwtService({
    secret: randomBytes(48).toString('hex'),
    signOptions: { expiresIn: '15m' },
  });
  const sessions = new SessionsService(prisma, jwt);
  const verifier = {
    verify: async (value: string) => {
      if (value === 'invalid') throw new Error('invalid provider token');
      return {
        subject: value,
        email:
          value === 'collision'
            ? 'local@tests.invalid'
            : `${value}@google-tests.invalid`,
        fullName: 'Provider Fixture',
      };
    },
  } as GoogleService;
  const auth = new AuthService(prisma, sessions, verifier);
  const password = `Test${randomBytes(16).toString('hex')}`;
  try {
    const local = await auth.register({
      email: 'local@tests.invalid',
      fullName: 'Local Fixture',
      password,
    });
    await assert.rejects(
      auth.googleLogin('collision'),
      (error: any) => error.getResponse().code === 'ACCOUNT_LINK_REQUIRED',
    );
    assert.equal(
      await db.authIdentity.count({ where: { userId: local.user.id } }),
      0,
    );
    await assert.rejects(
      auth.linkGoogle(local.user.id, 'collision', 'incorrect'),
    );
    await auth.linkGoogle(local.user.id, 'collision', password);
    assert.equal((await auth.googleLogin('collision')).user.id, local.user.id);
    const parallel = await Promise.all([
      auth.googleLogin('new-subject'),
      auth.googleLogin('new-subject'),
    ]);
    assert.equal(parallel[0].user.id, parallel[1].user.id);
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: parallel[0].user.id } }))
        .passwordHash,
      null,
    );
    await assert.rejects(
      auth.linkGoogle(local.user.id, 'new-subject', password),
    );
    const rotated = await sessions.refresh(local.refreshToken);
    assert.notEqual(rotated.refreshToken, local.refreshToken);
    await assert.rejects(sessions.refresh(local.refreshToken));
    await assert.rejects(sessions.refresh(rotated.refreshToken));
    const fresh = await auth.login({ email: local.user.email, password });
    await sessions.logout(fresh.refreshToken);
    await assert.rejects(sessions.refresh(fresh.refreshToken));
    const expired = await auth.login({ email: local.user.email, password });
    await db.session.updateMany({
      where: { refreshTokenHash: tokenHash(expired.refreshToken) },
      data: {
        createdAt: new Date(Date.now() - 86400000),
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    await assert.rejects(sessions.refresh(expired.refreshToken));
    const resetToken = randomBytes(48).toString('base64url');
    const beforeReset = await auth.login({ email: local.user.email, password });
    await db.passwordResetToken.create({
      data: {
        userId: local.user.id,
        tokenHash: tokenHash(resetToken),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    const recovery = new RecoveryService(prisma);
    await recovery.reset(resetToken, `${password}2`);
    await assert.rejects(recovery.reset(resetToken, `${password}3`));
    await assert.rejects(sessions.refresh(beforeReset.refreshToken));
    await assert.rejects(auth.login({ email: local.user.email, password }));
    const changed = await auth.login({
      email: local.user.email,
      password: `${password}2`,
    });
    await auth.deleteAccount(local.user.id, {
      currentPassword: `${password}2`,
    });
    assert.equal(
      await db.authIdentity.count({ where: { userId: local.user.id } }),
      0,
    );
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: local.user.id } }))
        .isActive,
      false,
    );
    await assert.rejects(sessions.refresh(changed.refreshToken));
    const suspended = await auth.googleLogin('new-subject');
    await db.user.update({
      where: { id: suspended.user.id },
      data: { isActive: false },
    });
    await assert.rejects(auth.googleLogin('new-subject'));
    await assert.rejects(sessions.refresh(suspended.refreshToken));
    console.info(
      'PASS auth scenarios: mocked Google subject/collision/linking/concurrency, rotation/reuse/logout/expiry, single-use reset, deletion and suspension',
    );
  } finally {
    await db.$disconnect();
  }
}
