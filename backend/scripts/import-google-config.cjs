// Import ONLY public IDs from user-owned Google downloads. Never copy client_secret.
const fs = require('node:fs');
const path = require('node:path');
const [webFile, androidFile] = process.argv.slice(2);
if (!webFile || !androidFile) throw new Error('Usage: node scripts/import-google-config.cjs <web.json> <android.json>');
const web = JSON.parse(fs.readFileSync(webFile, 'utf8')).web;
const android = JSON.parse(fs.readFileSync(androidFile, 'utf8')).installed;
for (const item of [web, android]) if (!item?.client_id?.endsWith('.apps.googleusercontent.com')) throw new Error('Invalid OAuth client ID');
const envPath = path.resolve(__dirname, '../.env');
let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : fs.readFileSync(path.resolve(__dirname, '../.env.example'), 'utf8');
for (const [key, value] of Object.entries({ GOOGLE_WEB_CLIENT_ID: web.client_id, GOOGLE_ANDROID_CLIENT_ID: android.client_id, GOOGLE_IOS_CLIENT_ID: '' })) {
  const line = `${key}="${value}"`; const pattern = new RegExp(`^${key}=.*$`, 'm'); env = pattern.test(env) ? env.replace(pattern, line) : `${env}\n${line}\n`;
}
fs.writeFileSync(envPath, env);
console.info('Imported web/Android public client IDs into ignored backend/.env. iOS disabled. No client secret was imported.');
