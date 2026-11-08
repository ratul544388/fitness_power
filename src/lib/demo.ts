/** Explicit, ephemeral sample data. Available ONLY in `npm run dev` with DEMO_MODE=true. */
import { addDays, subDays, format, addMonths } from "date-fns";
import { memberStatus } from "./utils";

type Row = Record<string, any>;
const iso = (day: Date) => format(day, "yyyy-MM-dd");
const now = new Date();
// Deterministic UUIDs make local preview exercise the same Zod API validation as production.
const did = (group:number,n:number) => `10000000-0000-4000-8000-${(group*10000+n).toString(16).padStart(12,"0")}`;
const names = ["Arman Rahman","Nadia Islam","Fahim Ahmed","Tanjim Hasan","Maya Chowdhury","Rafiul Karim","Samira Noor","Sajid Hossain","Raina Sultana","Rayhan Kabir","Anika Siddique","Mahin Chowdhury","Shafin Alam","Farhana Akter","Tanvir Rahman","Zara Ahmed","Iftekhar Nabil","Mehedi Hasan","Lamia Ahmed","Arafat Hossain","Nusrat Jahan","Junaid Khan","Tithi Saha","Naeem Uddin"];
const planSeed: Row[] = [
  {id:did(1,1),name:"Essential",durationMonths:1,price:1000,color:"#5786ff",description:"All-access gym floor",active:true},
  {id:did(1,2),name:"Performance",durationMonths:3,price:2500,color:"#9d72f8",description:"Save with a quarterly pass",active:true},
  {id:did(1,3),name:"Elite",durationMonths:6,price:4500,color:"#2dccad",description:"Extended commitment",active:true},
  {id:did(1,4),name:"Annual Pro",durationMonths:12,price:8000,color:"#e9b76d",description:"Our best annual value",active:true},
];
const memberSeed: Row[] = Array.from({length: 36}, (_,i) => {
  const plan = planSeed[i % 4];
  const start = subDays(now, 8 + (i * 9) % 95);
  const exp = i % 10 === 7 ? subDays(now, (i % 12) + 1) : addDays(now, (i * 7) % 135 + 1);
  return { id:did(2,i+1), memberNo: 101+i, name:names[i%names.length], phone: i%7===0?"":"01XX-XXX-"+String(1000+i), email:"", gender:i%4===1?"female":"male", dateOfBirth:"", address:"", emergencyContact:"", imageUrl:"", notes:"", planId:plan.id, planName:plan.name, planColor:plan.color, startDate:iso(start), expireDate:iso(exp), status:"active", daysLeft:Math.round((exp.getTime()-now.getTime())/86400000), joinedAt:start.toISOString(), archivedAt:null };
});
const staffSeed: Row[] = [
  {id:did(3,1),name:"Sakib Hasan",jobTitle:"Head Trainer",phone:"01XX-XXX-0001",email:"sakib@example.test",salary:28000,shift:"Morning",joinedOn:"2026-01-15",status:"active",imageUrl:""},
  {id:did(3,2),name:"Nabila Karim",jobTitle:"Fitness Coach",phone:"01XX-XXX-0002",email:"nabila@example.test",salary:24000,shift:"Evening",joinedOn:"2026-03-10",status:"active",imageUrl:""},
  {id:did(3,3),name:"Riyad Islam",jobTitle:"Front Desk",phone:"01XX-XXX-0003",email:"riyad@example.test",salary:18000,shift:"Rotating",joinedOn:"2026-05-07",status:"active",imageUrl:""},
  {id:did(3,4),name:"Ayesha Noor",jobTitle:"Nutrition Coach",phone:"01XX-XXX-0004",email:"ayesha@example.test",salary:26000,shift:"Morning",joinedOn:"2026-02-01",status:"on_leave",imageUrl:""},
];
const expenseSeed: Row[] = [
  {id:did(4,1),title:"Equipment maintenance",category:"maintenance",amount:4800,incurredOn:iso(subDays(now,2)),vendor:"Fitness Supply Co.",paymentMethod:"bank"},
  {id:did(4,2),title:"Electricity bill",category:"utilities",amount:9800,incurredOn:iso(subDays(now,6)),vendor:"Utility provider",paymentMethod:"cash"},
  {id:did(4,3),title:"Cleaning supplies",category:"supplies",amount:2100,incurredOn:iso(subDays(now,12)),vendor:"Local supplier",paymentMethod:"cash"},
  {id:did(4,4),title:"Gym advertising",category:"marketing",amount:6000,incurredOn:iso(subDays(now,16)),vendor:"Online ads",paymentMethod:"card"},
];
const paymentSeed: Row[] = Array.from({length:28},(_,i)=>({id:did(5,i+1),memberId:memberSeed[i%memberSeed.length].id,memberName:memberSeed[i%memberSeed.length].name,memberNo:memberSeed[i%memberSeed.length].memberNo,amount:[1000,2500,4500,8000][i%4],method:["cash","bkash","bank","cash"][i%4],type:i%3===0?"renewal":"membership",reference:"",paidAt:subDays(now,i*2).toISOString()}));
const attendanceSeed: Row[] = Array.from({length:12},(_,i)=>({id:did(6,i+1),memberId:memberSeed[i].id,memberName:memberSeed[i].name,memberNo:memberSeed[i].memberNo,checkedInAt:new Date(now.getFullYear(),now.getMonth(),now.getDate(),7+i%9,10).toISOString(),checkedOutAt:i<5?new Date(now.getFullYear(),now.getMonth(),now.getDate(),8+i%9,25).toISOString():null,source:"manual"}));
const lockerSeed: Row[] = Array.from({length:32},(_,i)=>({id:did(7,i+1),number:`${String.fromCharCode(65+Math.floor(i/8))}-${String(i%8+1).padStart(2,"0")}`,zone:["Ground floor","First floor","Women’s area","Premium zone"][Math.floor(i/8)],size:i%5===0?"large":"standard",monthlyRate:i%5===0?500:300,status:i%11===0?"maintenance":"available",memberId:i%3===0?memberSeed[i%memberSeed.length].id:null,memberName:i%3===0?memberSeed[i%memberSeed.length].name:null,assignmentId:i%3===0?did(8,i+1):null,dueOn:i%3===0?iso(addDays(now,10+i)):null}));
lockerSeed.forEach(l=>{if(l.memberId)l.status="occupied"});
const teamSeed: Row[] = [{id:"demo-owner",name:"Alex Morgan",email:"demo@fitnesspower.local",appRole:"owner",role:"admin",banned:false,createdAt:now.toISOString()}];
const settingsSeed: Row = {id:"main",gymName:"Fitness Power",gymPhone:"",gymEmail:"",gymAddress:"",currency:"BDT",timezone:"Asia/Dhaka",admissionFee:300};
const init = () => ({ members:memberSeed, plans:planSeed, lockers:lockerSeed, attendance:attendanceSeed, payments:paymentSeed, expenses:expenseSeed, staff:staffSeed, team:teamSeed, audit:[] as Row[], settings:[settingsSeed] });
type Store = ReturnType<typeof init>;
const container = globalThis as unknown as { fitnessPowerDemo?: Store };
const store: Store = container.fitnessPowerDemo ?? (container.fitnessPowerDemo = init());
export type Resource = keyof Store;
export function demoList(resource: Resource) { return resource === "members" ? store.members.filter(m => !m.archivedAt) : [...store[resource]]; }
export function demoCreate(resource: Resource, payload: Row) {
  const id = crypto.randomUUID();
  const item: Row = {id, ...payload, createdAt:new Date().toISOString()};
  if(resource === "members") {
    const plan=store.plans.find(p=>p.id===payload.planId) || store.plans[0];
    Object.assign(item,{memberNo:Math.max(...store.members.map(m=>m.memberNo),100)+1,planId:plan.id,planName:plan.name,planColor:plan.color,startDate:payload.startDate||iso(now),expireDate:iso(addMonths(new Date((payload.startDate||iso(now))+"T12:00:00"),plan.durationMonths)),status:"active"});
    if(Number(payload.amountPaid)>0)demoCreate("payments",{memberId:id,memberName:payload.name,amount:Number(payload.amountPaid),method:payload.paymentMethod||"cash",type:"membership",paidAt:new Date().toISOString()});
  }
  if(resource === "payments") { const m=store.members.find(m=>m.id===payload.memberId); item.memberName=m?.name||payload.memberName; item.memberNo=m?.memberNo; item.paidAt=new Date().toISOString(); }
  if(resource === "lockers")item.status=payload.status||"available";
  (store[resource] as Row[]).unshift(item);
  return item;
}
export function demoPatch(resource:Resource,id:string,payload:Row) {
  const row=(store[resource] as Row[]).find(r=>r.id===id);
  if(!row) throw new Error("Record not found");
  Object.assign(row,payload,{updatedAt:new Date().toISOString()});
  return row;
}
export function demoDelete(resource:Resource,id:string) {
  const rows=store[resource] as Row[];
  const index=rows.findIndex(r=>r.id===id);
  if(index<0)throw new Error("Record not found");
  if(resource==="members") {rows[index].archivedAt=new Date().toISOString();rows[index].status="inactive";return rows[index];}
  if(resource==="team")throw new Error("Demo owner cannot be removed");
  rows.splice(index,1);return {success:true};
}
export function demoAction(action:string,data:Row) {
  const m=store.members.find(m=>m.id===data.memberId);
  if(action==="renew") {
    if(!m)throw new Error("Member not found");
    const plan=store.plans.find(p=>p.id===data.planId);if(!plan)throw new Error("Plan not found");
    const start=data.startDate||iso(now);Object.assign(m,{planId:plan.id,planName:plan.name,planColor:plan.color,startDate:start,expireDate:iso(addMonths(new Date(start+"T12:00:00"),plan.durationMonths)),status:"active"});
    if(data.amountPaid>0)demoCreate("payments",{memberId:m.id,amount:Number(data.amountPaid),method:data.method||"cash",type:"renewal"});
    return m;
  }
  if(action==="checkin") {if(!m)throw new Error("Member not found");if(memberStatus(m)!=="active")throw new Error("Membership is not active");if(store.attendance.some(a=>a.memberId===m.id&&!a.checkedOutAt))throw new Error("Member already checked in");return demoCreate("attendance",{memberId:m.id,memberName:m.name,memberNo:m.memberNo,checkedInAt:new Date().toISOString(),checkedOutAt:null,source:"manual"});}
  if(action==="checkout") {const a=store.attendance.find(a=>a.id===data.attendanceId);if(!a)throw new Error("Visit not found");a.checkedOutAt=new Date().toISOString();return a;}
  if(action==="locker-assign") {const l=store.lockers.find(l=>l.id===data.lockerId);if(!l)throw new Error("Locker not found");if(l.status!=="available")throw new Error("Locker is not available");if(!m)throw new Error("Member not found");Object.assign(l,{memberId:m.id,memberName:m.name,status:"occupied",assignmentId:crypto.randomUUID(),dueOn:data.dueOn});return l;}
  if(action==="locker-release") {const l=store.lockers.find(l=>l.id===data.lockerId);if(!l)throw new Error("Locker not found");Object.assign(l,{memberId:null,memberName:null,status:"available",assignmentId:null,dueOn:null});return l;}
  throw new Error("Unknown action");
}
export function demoOverview() {
  const active=store.members.filter(m=>memberStatus(m)==="active").length;
  const expired=store.members.filter(m=>memberStatus(m)==="expired").length;
  const revenue=store.payments.reduce((a,p)=>a+p.amount,0);
  const spent=store.expenses.reduce((a,e)=>a+e.amount,0);
  const occupied=store.lockers.filter(l=>l.status==="occupied").length;
  const monthly=Array.from({length:7},(_,i)=>({month:format(subDays(now,(6-i)*30),"MMM"),revenue:[32500,44200,38900,57400,48600,65200,76000][i],expenses:[18500,21000,17400,23400,19200,26000,22700][i]}));
  return { totalMembers:store.members.length,activeMembers:active,expiredMembers:expired,newMembers:4,monthRevenue:76000,totalRevenue:revenue,monthExpenses:spent,netProfit:76000-spent,todayRevenue:4600,todayAttendance:store.attendance.length,currentlyInside:store.attendance.filter(a=>!a.checkedOutAt).length,totalLockers:store.lockers.length,occupiedLockers:occupied,staffCount:store.staff.filter(s=>s.status==="active").length,monthly,recentPayments:store.payments.slice(0,5),expiring:store.members.filter(m=>m.daysLeft>=0&&m.daysLeft<=12).slice(0,5),recentAttendance:store.attendance.slice(0,6),planDistribution:store.plans.map(p=>({name:p.name,value:store.members.filter(m=>m.planId===p.id).length,color:p.color}))};
}
