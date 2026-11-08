import { db } from "@/db";
import { members, plans, memberships, payments, attendance, lockers, lockerAssignments, expenses, staff, settings, user, session, account, auditLogs } from "@/db/schema";
import { eq, and, isNull, desc, asc, getTableColumns, sql, sum } from "drizzle-orm";
import { format, startOfMonth, subMonths } from "date-fns";
import { addPlanMonths, memberStatus, daysUntil, todayISO, dateKey } from "./utils";
import { ApiError, demoEnabled } from "./permissions";
import type { Actor } from "./access";
import { hashPassword } from "better-auth/crypto";
import { type ResourceName } from "./validators";
import { demoList, demoCreate, demoPatch, demoDelete, demoAction, demoOverview } from "./demo";

// Return safe, UI-oriented records. Every read is behind requireActor in the route.
export async function listResource(resource: ResourceName) {
  if (demoEnabled()) return demoList(resource);
  switch(resource) {
    case "members": {
      const rows = await db.select({ ...getTableColumns(members), planName:plans.name, planColor:plans.color })
        .from(members).leftJoin(plans,eq(members.planId,plans.id)).where(isNull(members.archivedAt)).orderBy(desc(members.joinedAt)).limit(3000);
      return rows.map(r=>({...r,membershipStatus:memberStatus(r),daysLeft:daysUntil(r.expireDate)}));
    }
    case "plans": return await db.select({...getTableColumns(plans), memberCount:sql<number>`count(${members.id})::int`})
      .from(plans).leftJoin(members,and(eq(plans.id,members.planId),isNull(members.archivedAt)))
      .groupBy(plans.id).orderBy(asc(plans.durationMonths));
    case "payments": return await db.select({ ...getTableColumns(payments),memberName:members.name,memberNo:members.memberNo })
      .from(payments).innerJoin(members,eq(payments.memberId,members.id)).orderBy(desc(payments.paidAt)).limit(3000);
    case "attendance": return await db.select({ ...getTableColumns(attendance),memberName:members.name,memberNo:members.memberNo,memberImage:members.imageUrl })
      .from(attendance).innerJoin(members,eq(attendance.memberId,members.id)).orderBy(desc(attendance.checkedInAt)).limit(1500);
    case "lockers": {
      const rows=await db.select({ ...getTableColumns(lockers),memberId:lockerAssignments.memberId,memberName:members.name,assignmentId:lockerAssignments.id,dueOn:lockerAssignments.dueOn })
        .from(lockers).leftJoin(lockerAssignments,and(eq(lockers.id,lockerAssignments.lockerId),isNull(lockerAssignments.releasedAt)))
        .leftJoin(members,eq(lockerAssignments.memberId,members.id)).orderBy(asc(lockers.number));
      return rows.map(r=>({...r,status:r.memberId ? "occupied":r.status}));
    }
    case "expenses":return await db.select().from(expenses).orderBy(desc(expenses.incurredOn)).limit(3000);
    case "staff":return await db.select().from(staff).orderBy(asc(staff.name));
    case "team":return await db.select({id:user.id,name:user.name,email:user.email,appRole:user.appRole,role:user.role,banned:user.banned,createdAt:user.createdAt,image:user.image}).from(user).orderBy(desc(user.createdAt));
    case "settings":return await db.select().from(settings).limit(1);
    case "audit":return await db.select({...getTableColumns(auditLogs),actorName:user.name}).from(auditLogs).leftJoin(user,eq(auditLogs.actorId,user.id)).orderBy(desc(auditLogs.createdAt)).limit(250);
  }
}

async function logEvent(tx:any, actor:Actor, action:string, entity:string, entityId:string,detail?:Record<string,unknown>) {
  await tx.insert(auditLogs).values({actorId:actor.id,action,entity,entityId,detail:detail || null});
}
function isUniqueConstraint(error:unknown) {
  return typeof error === "object" && error !== null && ("code" in error && (error as {code?:string}).code==="23505");
}
export function normalizeDbError(error:unknown):never {
  if(error instanceof ApiError) throw error;
  if(isUniqueConstraint(error))throw new ApiError(409,"A record with these details already exists.");
  if(typeof error === "object" && error && "code" in error && (error as {code?:string}).code==="23503")throw new ApiError(409,"This record is still in use and cannot be removed.");
  throw error;
}

export async function createResource(resource:ResourceName,payload:any,actor:Actor) {
  if(demoEnabled()) {
    if(resource==="team") {const {password: _secret, ...safe}=payload;void _secret;return demoCreate("team",{...safe,role:payload.appRole==="admin"?"admin":"user",banned:false});}
    return demoCreate(resource as any,payload);
  }
  try {
    switch(resource) {
      case "members": return await db.transaction(async(tx)=>{
        const [plan]=await tx.select().from(plans).where(eq(plans.id,payload.planId)).limit(1);
        if(!plan||!plan.active)throw new ApiError(422,"Select an active membership plan.");
        const [config]=await tx.select().from(settings).limit(1);
        const due=plan.price+(config?.admissionFee||0)-payload.discount;
        if(due<0 || payload.amountPaid>due)throw new ApiError(422,"Amount paid must be between zero and the total after discount.");
        const expiry=addPlanMonths(payload.startDate,plan.durationMonths);
        const [record]=await tx.insert(members).values({name:payload.name,phone:payload.phone||null,email:payload.email||null,gender:payload.gender,dateOfBirth:payload.dateOfBirth||null,address:payload.address||null,emergencyContact:payload.emergencyContact||null,imageUrl:payload.imageUrl||null,notes:payload.notes||null,planId:plan.id,startDate:payload.startDate,expireDate:expiry,status:payload.status}).returning();
        const [period]=await tx.insert(memberships).values({memberId:record.id,planId:plan.id,startsOn:payload.startDate,expiresOn:expiry,planPrice:plan.price,admissionFee:config?.admissionFee||0,discount:payload.discount,type:"join",createdBy:actor.id}).returning();
        if(payload.amountPaid>0)await tx.insert(payments).values({memberId:record.id,membershipId:period.id,amount:payload.amountPaid,method:payload.paymentMethod,type:"membership",createdBy:actor.id});
        await logEvent(tx,actor,"created","members",record.id,{name:record.name,memberNo:record.memberNo});
        return record;
      });
      case "plans":return await db.transaction(async(tx)=>{const [r]=await tx.insert(plans).values(payload).returning();await logEvent(tx,actor,"created","plans",r.id,{name:r.name});return r;});
      case "lockers":return await db.transaction(async(tx)=>{const [r]=await tx.insert(lockers).values(payload).returning();await logEvent(tx,actor,"created","lockers",r.id,{number:r.number});return r;});
      case "expenses":return await db.transaction(async(tx)=>{const [r]=await tx.insert(expenses).values({...payload,createdBy:actor.id}).returning();await logEvent(tx,actor,"created","expenses",r.id,{title:r.title,amount:r.amount});return r;});
      case "staff":return await db.transaction(async(tx)=>{const [r]=await tx.insert(staff).values({...payload,joinedOn:payload.joinedOn||null,email:payload.email||null}).returning();await logEvent(tx,actor,"created","staff",r.id,{name:r.name});return r;});
      case "payments":return await db.transaction(async(tx)=>{
        const [member]=await tx.select({id:members.id}).from(members).where(and(eq(members.id,payload.memberId),isNull(members.archivedAt))).limit(1);
        if(!member)throw new ApiError(404,"Member not found.");
        let membershipId=payload.membershipId||null;
        if(!membershipId && (payload.type==="membership"||payload.type==="renewal")) {
          const [last]=await tx.select().from(memberships).where(eq(memberships.memberId,member.id)).orderBy(desc(memberships.createdAt)).limit(1);
          membershipId=last?.id||null;
        }
        if(membershipId){
          const [period]=await tx.select().from(memberships).where(eq(memberships.id,membershipId)).limit(1);
          if(!period || period.memberId!==member.id)throw new ApiError(422,"Membership payment does not match member.");
          const [prior]=await tx.select({paid:sum(payments.amount)}).from(payments).where(eq(payments.membershipId,membershipId));
          const due=period.planPrice+period.admissionFee-period.discount-Number(prior?.paid||0);
          if(payload.amount>due)throw new ApiError(422,`Payment exceeds outstanding balance (${due}).`);
        }
        const [r]=await tx.insert(payments).values({...payload,membershipId,createdBy:actor.id}).returning();
        await logEvent(tx,actor,"received","payments",r.id,{amount:r.amount,memberId:r.memberId});return r;
      });
      case "team":{
        if(payload.appRole==="owner")throw new ApiError(403,"Only the original owner can hold the owner role.");
        // Create the Better Auth credential account atomically under our own RBAC.
        // Avoid exposing Better Auth's unrestricted built-in admin endpoints to dashboard admins.
        const id=crypto.randomUUID(),email=payload.email.trim().toLowerCase();
        const hashed=await hashPassword(payload.password);
        return await db.transaction(async tx=>{
          await tx.insert(user).values({id,name:payload.name,email,emailVerified:true,role:"user",appRole:payload.appRole});
          await tx.insert(account).values({id:crypto.randomUUID(),accountId:id,providerId:"credential",userId:id,password:hashed});
          await logEvent(tx,actor,"created","team",id,{email,role:payload.appRole});
          return {id,name:payload.name,email,appRole:payload.appRole};
        });
      }
      default:throw new ApiError(405,"Cannot create a record in this section.");
    }
  }catch(error){return normalizeDbError(error);}
}

export async function updateResource(resource:ResourceName,id:string,payload:any,actor:Actor) {
  if(demoEnabled())return demoPatch(resource as any,id,payload);
  try {
    switch(resource) {
      case "members":return await db.transaction(async(tx)=>{
        const [r]=await tx.update(members).set({...payload,...("email" in payload ? {email:payload.email||null}:{}),...("dateOfBirth" in payload ? {dateOfBirth:payload.dateOfBirth||null}:{}),updatedAt:new Date()}).where(and(eq(members.id,id),isNull(members.archivedAt))).returning();
        if(!r)throw new ApiError(404,"Member not found.");await logEvent(tx,actor,"updated","members",id);return r;});
      case "plans":return await db.transaction(async(tx)=>{const [r]=await tx.update(plans).set(payload).where(eq(plans.id,id)).returning();if(!r)throw new ApiError(404,"Plan not found.");await logEvent(tx,actor,"updated","plans",id);return r;});
      case "lockers":return await db.transaction(async(tx)=>{
        const [assignment]=await tx.select().from(lockerAssignments).where(and(eq(lockerAssignments.lockerId,id),isNull(lockerAssignments.releasedAt))).limit(1);
        if(assignment&&payload.status==="maintenance")throw new ApiError(409,"Release the locker before marking it for maintenance.");
        const [r]=await tx.update(lockers).set(payload).where(eq(lockers.id,id)).returning();if(!r)throw new ApiError(404,"Locker not found.");await logEvent(tx,actor,"updated","lockers",id);return r;});
      case "expenses":return await db.transaction(async(tx)=>{const [r]=await tx.update(expenses).set(payload).where(eq(expenses.id,id)).returning();if(!r)throw new ApiError(404,"Expense not found.");await logEvent(tx,actor,"updated","expenses",id);return r;});
      case "staff":return await db.transaction(async(tx)=>{const [r]=await tx.update(staff).set({...payload,...("joinedOn" in payload ? {joinedOn:payload.joinedOn||null}:{}),...("email" in payload ? {email:payload.email||null}:{})}).where(eq(staff.id,id)).returning();if(!r)throw new ApiError(404,"Staff not found.");await logEvent(tx,actor,"updated","staff",id);return r;});
      case "settings":return await db.transaction(async(tx)=>{
        const [r]=await tx.insert(settings).values({...payload,id:"main",updatedAt:new Date()}).onConflictDoUpdate({target:settings.id,set:{...payload,updatedAt:new Date()}}).returning();
        await logEvent(tx,actor,"updated","settings","main");return r;});
      case "team":return await db.transaction(async(tx)=>{
        const [target]=await tx.select().from(user).where(eq(user.id,id)).limit(1);
        if(!target)throw new ApiError(404,"Team member not found.");
        if(target.appRole==="owner")throw new ApiError(403,"The owner account cannot be modified here.");
        if(actor.id===id&&(payload.banned===true||payload.appRole&&payload.appRole!==actor.role))throw new ApiError(403,"You cannot disable or demote yourself.");
        const changes={...payload};
        const [r]=await tx.update(user).set(changes).where(eq(user.id,id)).returning();
        if(payload.banned===true||payload.appRole)await tx.delete(session).where(eq(session.userId,id));
        await logEvent(tx,actor,"updated","team",id,{appRole:r.appRole,banned:r.banned});
        return {id:r.id,name:r.name,email:r.email,appRole:r.appRole,banned:r.banned};});
      default:throw new ApiError(405,"Editing is not supported for this section.");
    }
  }catch(error){return normalizeDbError(error);}
}

export async function deleteResource(resource:ResourceName,id:string,actor:Actor) {
  if(demoEnabled())return demoDelete(resource as any,id);
  try {
    switch(resource) {
      case "members":return await db.transaction(async(tx)=>{const [r]=await tx.update(members).set({archivedAt:new Date(),status:"inactive",updatedAt:new Date()}).where(and(eq(members.id,id),isNull(members.archivedAt))).returning();if(!r)throw new ApiError(404,"Member not found.");await logEvent(tx,actor,"archived","members",id,{name:r.name});return {success:true};});
      case "plans":return await db.transaction(async(tx)=>{const [used]=await tx.select({id:members.id}).from(members).where(eq(members.planId,id)).limit(1);if(used)throw new ApiError(409,"This plan has members. Deactivate it instead of deleting it.");const [r]=await tx.delete(plans).where(eq(plans.id,id)).returning();if(!r)throw new ApiError(404,"Plan not found.");await logEvent(tx,actor,"deleted","plans",id);return {success:true};});
      case "lockers":return await db.transaction(async(tx)=>{const [used]=await tx.select({id:lockerAssignments.id}).from(lockerAssignments).where(eq(lockerAssignments.lockerId,id)).limit(1);if(used)throw new ApiError(409,"Locker has assignment history. Mark it for maintenance instead.");const [r]=await tx.delete(lockers).where(eq(lockers.id,id)).returning();if(!r)throw new ApiError(404,"Locker not found.");await logEvent(tx,actor,"deleted","lockers",id);return {success:true};});
      case "expenses":return await db.transaction(async(tx)=>{const [r]=await tx.delete(expenses).where(eq(expenses.id,id)).returning();if(!r)throw new ApiError(404,"Expense not found.");await logEvent(tx,actor,"deleted","expenses",id,{amount:r.amount});return {success:true};});
      case "staff":return await db.transaction(async(tx)=>{const [r]=await tx.delete(staff).where(eq(staff.id,id)).returning();if(!r)throw new ApiError(404,"Staff not found.");await logEvent(tx,actor,"deleted","staff",id);return {success:true};});
      default:throw new ApiError(405,"Deleting is not allowed here. Financial payments and attendance history are immutable.");
    }
  }catch(error){return normalizeDbError(error);}
}

export async function performAction(action:string,payload:any,actor:Actor) {
  if(demoEnabled())return demoAction(action,payload);
  try {
    if(action==="renew")return await db.transaction(async(tx)=>{
      const [member]=await tx.select().from(members).where(and(eq(members.id,payload.memberId),isNull(members.archivedAt))).limit(1);
      const [plan]=await tx.select().from(plans).where(eq(plans.id,payload.planId)).limit(1);
      if(!member)throw new ApiError(404,"Member not found.");
      if(!plan||!plan.active)throw new ApiError(422,"Choose an active plan.");
      const total=plan.price-payload.discount;
      if(total<0||payload.amountPaid>total)throw new ApiError(422,"Paid amount exceeds the discounted total.");
      // The date is explicitly selected in the renew dialog; no silent loss of remaining days.
      const expires=addPlanMonths(payload.startDate,plan.durationMonths);
      const [period]=await tx.insert(memberships).values({memberId:member.id,planId:plan.id,startsOn:payload.startDate,expiresOn:expires,planPrice:plan.price,discount:payload.discount,type:"renew",note:payload.note,createdBy:actor.id}).returning();
      await tx.update(members).set({planId:plan.id,startDate:payload.startDate,expireDate:expires,status:"active",updatedAt:new Date()}).where(eq(members.id,member.id));
      if(payload.amountPaid>0)await tx.insert(payments).values({memberId:member.id,membershipId:period.id,amount:payload.amountPaid,method:payload.method,type:"renewal",createdBy:actor.id});
      await logEvent(tx,actor,"renewed","members",member.id,{plan:plan.name,expires});
      return {memberId:member.id,expiresOn:expires};
    });
    if(action==="checkin")return await db.transaction(async(tx)=>{
      const [member]=await tx.select().from(members).where(and(eq(members.id,payload.memberId),isNull(members.archivedAt))).limit(1);
      if(!member)throw new ApiError(404,"Member not found.");
      if(memberStatus(member)!=="active")throw new ApiError(422,"Membership is expired, inactive, or frozen.");
      const [existing]=await tx.select().from(attendance).where(and(eq(attendance.memberId,member.id),isNull(attendance.checkedOutAt))).limit(1);
      if(existing)throw new ApiError(409,"Member is already checked in. Check them out first.");
      const [r]=await tx.insert(attendance).values({memberId:member.id,source:"manual"}).returning();
      await logEvent(tx,actor,"checkin","attendance",r.id,{memberId:member.id});return r;
    });
    if(action==="checkout")return await db.transaction(async(tx)=>{
      const [r]=await tx.update(attendance).set({checkedOutAt:new Date()}).where(and(eq(attendance.id,payload.attendanceId),isNull(attendance.checkedOutAt))).returning();
      if(!r)throw new ApiError(404,"Active check-in not found.");await logEvent(tx,actor,"checkout","attendance",r.id);return r;
    });
    if(action==="locker-assign")return await db.transaction(async(tx)=>{
      const [locker]=await tx.select().from(lockers).where(eq(lockers.id,payload.lockerId)).limit(1);
      const [member]=await tx.select().from(members).where(and(eq(members.id,payload.memberId),isNull(members.archivedAt))).limit(1);
      if(!locker||locker.status!=="available")throw new ApiError(409,"Locker is not available.");
      if(!member)throw new ApiError(404,"Member not found.");
      if(memberStatus(member)!=="active")throw new ApiError(422,"Member must have an active membership.");
      const [already]=await tx.select().from(lockerAssignments).where(and(eq(lockerAssignments.lockerId,locker.id),isNull(lockerAssignments.releasedAt))).limit(1);
      if(already)throw new ApiError(409,"Locker is already assigned.");
      const [r]=await tx.insert(lockerAssignments).values({lockerId:locker.id,memberId:member.id,dueOn:payload.dueOn||null,note:payload.note||null}).returning();
      await logEvent(tx,actor,"assigned","lockers",locker.id,{memberId:member.id});return r;
    });
    if(action==="locker-release")return await db.transaction(async(tx)=>{
      const [r]=await tx.update(lockerAssignments).set({releasedAt:new Date()}).where(and(eq(lockerAssignments.lockerId,payload.lockerId),isNull(lockerAssignments.releasedAt))).returning();
      if(!r)throw new ApiError(404,"There is no active assignment for this locker.");
      await logEvent(tx,actor,"released","lockers",payload.lockerId,{memberId:r.memberId});return r;
    });
    throw new ApiError(404,"Unknown operation.");
  }catch(error){return normalizeDbError(error);}
}

export async function getOverview() {
  if(demoEnabled())return demoOverview();
  const [membersRows,paymentRows,expenseRows,attendanceRows,lockerRows,staffRows,planRows] = await Promise.all([
    db.select({id:members.id,name:members.name,planId:members.planId,status:members.status,expireDate:members.expireDate,archivedAt:members.archivedAt,joinedAt:members.joinedAt}).from(members).where(isNull(members.archivedAt)).limit(5000),
    db.select({id:payments.id,amount:payments.amount,paidAt:payments.paidAt,memberName:members.name,memberNo:members.memberNo,method:payments.method}).from(payments).innerJoin(members,eq(payments.memberId,members.id)).orderBy(desc(payments.paidAt)).limit(10000),
    db.select().from(expenses).orderBy(desc(expenses.incurredOn)).limit(10000),
    db.select({id:attendance.id,memberId:attendance.memberId,memberName:members.name,memberNo:members.memberNo,checkedInAt:attendance.checkedInAt,checkedOutAt:attendance.checkedOutAt,source:attendance.source}).from(attendance).innerJoin(members,eq(attendance.memberId,members.id)).orderBy(desc(attendance.checkedInAt)).limit(4000),
    db.select({id:lockers.id,status:lockers.status,assignmentId:lockerAssignments.id}).from(lockers).leftJoin(lockerAssignments,and(eq(lockers.id,lockerAssignments.lockerId),isNull(lockerAssignments.releasedAt))),
    db.select({id:staff.id,status:staff.status}).from(staff),
    db.select({id:plans.id,name:plans.name,color:plans.color}).from(plans),
  ]);
  const [config]=await db.select({timezone:settings.timezone}).from(settings).limit(1);
  const timezone=config?.timezone||"Asia/Dhaka";
  const today=todayISO(timezone), month=today.slice(0,7);
  const monthly=Array.from({length:7},(_,i)=>{
    const date=subMonths(startOfMonth(new Date()),6-i),key=format(date,"yyyy-MM");
    return {month:format(date,"MMM"),revenue:paymentRows.filter(p=>dateKey(p.paidAt,timezone).slice(0,7)===key).reduce((s,p)=>s+p.amount,0),expenses:expenseRows.filter(e=>e.incurredOn.slice(0,7)===key).reduce((s,e)=>s+e.amount,0)};
  });
  const totalRevenue=paymentRows.reduce((s,p)=>s+p.amount,0);
  const monthRevenue=paymentRows.filter(p=>dateKey(p.paidAt,timezone).slice(0,7)===month).reduce((s,p)=>s+p.amount,0);
  const monthExpenses=expenseRows.filter(e=>e.incurredOn.slice(0,7)===month).reduce((s,e)=>s+e.amount,0);
  const expiring=membersRows.filter(m=>memberStatus(m)==="active" && daysUntil(m.expireDate)<=10).sort((a,b)=>daysUntil(a.expireDate)-daysUntil(b.expireDate)).slice(0,6);
  return {
    totalMembers:membersRows.length, activeMembers:membersRows.filter(m=>memberStatus(m)==="active").length,expiredMembers:membersRows.filter(m=>memberStatus(m)==="expired").length,
    newMembers:membersRows.filter(m=>dateKey(m.joinedAt,timezone).slice(0,7)===month).length,
    totalRevenue,monthRevenue,monthExpenses,netProfit:monthRevenue-monthExpenses,
    todayRevenue:paymentRows.filter(p=>dateKey(p.paidAt,timezone)===today).reduce((s,p)=>s+p.amount,0),
    todayAttendance:attendanceRows.filter(a=>dateKey(a.checkedInAt,timezone)===today).length,
    currentlyInside:attendanceRows.filter(a=>!a.checkedOutAt).length,
    totalLockers:lockerRows.length,occupiedLockers:lockerRows.filter(l=>l.assignmentId!==null).length,
    staffCount:staffRows.filter(s=>s.status==="active").length,
    monthly,recentPayments:paymentRows.slice(0,6),expiring,recentAttendance:attendanceRows.slice(0,6),
    planDistribution:planRows.map(p=>({name:p.name,value:membersRows.filter(m=>m.planId===p.id).length,color:p.color})),
  };
}
