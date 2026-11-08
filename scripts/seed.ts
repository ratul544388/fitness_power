import { config } from "dotenv";
config({path:".env.local",override:true});
async function run(){
  if(!process.env.DATABASE_URL)throw new Error("Set DATABASE_URL in .env.local first");
  // Load DB only after .env.local has been parsed.
  const [{ db }, { plans, lockers, settings }] = await Promise.all([import("../src/db"), import("../src/db/schema")]);
  await db.insert(settings).values({id:"main",gymName:"Fitness Power",currency:"BDT",timezone:"Asia/Dhaka"}).onConflictDoNothing();
  const defaults=[
    {name:"Essential",durationMonths:1,price:1000,description:"Monthly access",color:"#5786ff"},
    {name:"Performance",durationMonths:3,price:2500,description:"Quarterly access",color:"#9976f7"},
    {name:"Elite",durationMonths:6,price:4500,description:"Six-month access",color:"#2dccad"},
    {name:"Annual Pro",durationMonths:12,price:8000,description:"Year-round access",color:"#e4b56b"},
  ];
  for(const plan of defaults)await db.insert(plans).values(plan).onConflictDoNothing();
  for(let i=0;i<32;i++)await db.insert(lockers).values({number:`${String.fromCharCode(65+Math.floor(i/8))}-${String(i%8+1).padStart(2,"0")}`,zone:["Ground floor","First floor","Women’s area","Premium zone"][Math.floor(i/8)],size:i%5===0?"large":"standard",monthlyRate:i%5===0?500:300}).onConflictDoNothing();
  console.log("Default plans and 32 unassigned lockers are ready. No fictional member or payment records were inserted.");
  process.exit(0);
}
run().catch(e=>{console.error(e);process.exit(1)});
