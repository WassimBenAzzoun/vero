import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
export function mountWeb(app: INestApplication) {
  if (process.env.SERVE_WEB !== 'true') return;
  const frontend = resolve(__dirname, '../../frontend');
  const client = resolve(frontend, 'dist/client'),
    server = resolve(frontend, 'dist/server');
  if (!existsSync(server))
    throw new Error('Export Expo web before enabling SERVE_WEB');
  const frontendRequire = createRequire(resolve(frontend, 'package.json'));
  const { createRequestHandler } = frontendRequire(
    'expo-server/adapter/express',
  );
  const assets = express.static(client, { index: false, maxAge: '1h' }),
    handler = createRequestHandler({ build: server });
  const db=app.get(PrismaService);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      req.path === '/api' ||
      req.path.startsWith('/api/') ||
      req.path === '/docs' ||
      req.path.startsWith('/docs/')
    )
      return next();
    if(process.env.PUBLIC_WEB_URL && req.hostname !== new URL(process.env.PUBLIC_WEB_URL).hostname)
      return res.redirect(308, process.env.PUBLIC_WEB_URL.replace(/\/$/,'') + req.originalUrl);
    const origin=process.env.PUBLIC_WEB_URL || 'http://localhost:3000';
    if(req.path==='/robots.txt')return res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /profile\nDisallow: /login\nDisallow: /register\nDisallow: /my-reviews\nDisallow: /reset-password\nSitemap: ${origin}/sitemap.xml\n`);
    if(req.path==='/sitemap.xml'){
      void Promise.all([
        db.shop.findMany({where:{status:'ACTIVE'},select:{id:true},take:25000,orderBy:{id:'asc'}}),
        db.review.findMany({where:{status:'PUBLISHED',shop:{status:'ACTIVE'}},select:{id:true},take:24999,orderBy:{id:'asc'}})
      ]).then(([shops,reviews])=>{
        const urls=['/',...shops.map(s=>`/shops/${s.id}`),...reviews.map(r=>`/reviews/${r.id}`)];
        res.setHeader('Cache-Control','no-store');
        res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path=>`<url><loc>${origin}${path}</loc></url>`).join('')}</urlset>`);
      }).catch(next);return;
    }
    // HTML/loaders must reflect moderation immediately; only immutable assets are cached.
    res.setHeader('Cache-Control', 'no-store');
    assets(req, res, (error) =>
      error ? next(error) : handler(req, res, next),
    );
  });
}
