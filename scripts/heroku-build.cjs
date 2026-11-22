const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function node(args,cwd=root){const result=spawnSync(process.execPath,args,{cwd,stdio:'inherit',env:{...process.env,NODE_ENV:'production',CI:'1'}});if(result.status!==0)process.exit(result.status||1);}
const pnpm=require.resolve('pnpm/bin/pnpm.mjs');
node([pnpm,'--dir','backend','install','--frozen-lockfile','--prod=false']);
node([pnpm,'--dir','backend','exec','prisma','generate']);
node([pnpm,'--dir','backend','build']);
const npm=process.env.npm_execpath;
if(!npm)throw new Error('Run through npm run heroku-postbuild');
node([npm,'ci','--include=dev'],path.join(root,'frontend'));
node([npm,'exec','--','@expo/agent-cli@latest','export','--platform','web','--max-workers','2'],path.join(root,'frontend'));


