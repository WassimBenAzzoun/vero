// Explicit one-time provisioning, independent of the development/demo seed.
const {Client}=require('pg');
const bcrypt=require('bcrypt');
const {randomUUID}=require('node:crypto');
(async()=>{
 const email=process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase(),password=process.env.BOOTSTRAP_ADMIN_PASSWORD;
 if(!email||!password||password.length<20)throw new Error('Set explicit bootstrap email and a strong temporary password');
 const db=new Client({connectionString:process.env.DATABASE_URL});
 await db.connect();try{
  await db.query('BEGIN');
  const existing=await db.query('SELECT id,is_active,deleted_at FROM users WHERE email=$1 FOR UPDATE',[email]);
  if(existing.rows[0]) {
   if(!existing.rows[0].is_active||existing.rows[0].deleted_at)throw new Error('Cannot promote an inactive account');
   await db.query("UPDATE users SET role='ADMIN',updated_at=now() WHERE id=$1",[existing.rows[0].id]);
   console.log('Existing account promoted; password unchanged.');
  } else {
   await db.query("INSERT INTO users(id,email,password_hash,full_name,role,is_active,updated_at) VALUES($1,$2,$3,'Vero Admin','ADMIN',true,now())",[randomUUID(),email,await bcrypt.hash(password,12)]);
   console.log('Administrator provisioned. Change the temporary password after signing in.');
  }
  await db.query('COMMIT');
 }catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}
})().catch(()=>{console.error('Administrator provisioning failed. No credentials logged.');process.exit(1);});
