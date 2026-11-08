import { config } from "dotenv";
config({path:".env.local",override:true});
import { hashPassword } from "better-auth/crypto";
import { eq, sql } from "drizzle-orm";

async function run(){
  const email=process.env.BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();
  const name=process.env.BOOTSTRAP_OWNER_NAME?.trim();
  const password=process.env.BOOTSTRAP_OWNER_PASSWORD;
  if(!process.env.DATABASE_URL || !email || !name || !password || password.length<16 || password.includes("REPLACE_"))throw new Error("Set DATABASE_URL and valid BOOTSTRAP_OWNER_EMAIL, NAME, PASSWORD (min 16 characters) in .env.local");
  // Load the DB module only after .env.local has been parsed; ESM static imports execute before config().
  const [{ db }, { user, account, settings }] = await Promise.all([import("../src/db"), import("../src/db/schema")]);
  const [existing]=await db.select({id:user.id}).from(user).where(eq(user.email,email)).limit(1);
  if(existing)throw new Error("This email already exists. Owner bootstrap is intentionally one-time; use Team Access afterward.");
  const [owners]=await db.select({count:sql<number>`count(*)::int`}).from(user).where(eq(user.appRole,"owner"));
  if(Number(owners?.count||0)>0)throw new Error("An owner already exists. Bootstrap is disabled to prevent privilege escalation.");
  const id=crypto.randomUUID();
  const hashed=await hashPassword(password);
  await db.transaction(async(tx)=>{
    await tx.insert(user).values({id,name,email,emailVerified:true,role:"user",appRole:"owner"});
    await tx.insert(account).values({id:crypto.randomUUID(),accountId:id,providerId:"credential",userId:id,password:hashed});
    await tx.insert(settings).values({id:"main",gymName:"Fitness Power"}).onConflictDoNothing();
  });
  console.log(`Owner account created: ${email}. Sign in at /login. Remove BOOTSTRAP_OWNER_PASSWORD from the environment afterward.`);
  process.exit(0);
}
run().catch(e=>{console.error(e instanceof Error?e.message:e);process.exit(1)});
