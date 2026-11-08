import { NextRequest, NextResponse } from "next/server";
import { listResource } from "@/lib/data";
import { requireActor, ApiError } from "@/lib/permissions";
import { failure } from "@/lib/http";
import { isResource } from "@/lib/validators";
export const runtime="nodejs";
type Props={params:Promise<{resource:string}>};
const exportColumns:Record<string,string[]>={
  members:["memberNo","name","phone","email","gender","planName","status","startDate","expireDate"],
  plans:["name","durationMonths","price","active","memberCount"],payments:["memberNo","memberName","amount","method","type","reference","paidAt"],
  attendance:["memberNo","memberName","checkedInAt","checkedOutAt","source"],lockers:["number","zone","size","status","memberName","dueOn"],
  expenses:["title","category","amount","vendor","incurredOn","paymentMethod"],staff:["name","jobTitle","phone","email","shift","salary","status"],
};
function csvSafe(v:unknown) {
  const raw=v==null?"":v instanceof Date?v.toISOString():String(v);
  // Prevent spreadsheet formula injection with untrusted member/expense text.
  const escaped=/^[\s]*[=+\-@]/.test(raw)?`'${raw}`:raw;
  return `"${escaped.replaceAll('"','""')}"`;
}
export async function GET(_req:NextRequest,{params}:Props){
  try{const {resource}=await params;if(!isResource(resource)||!exportColumns[resource])throw new ApiError(404,"Export not supported.");await requireActor();
    const rows=await listResource(resource) as Array<Record<string,unknown>>;const fields=exportColumns[resource];
    const csv=[fields.map(csvSafe).join(","),...rows.map(r=>fields.map(f=>csvSafe(r[f])).join(","))].join("\r\n");
    return new NextResponse("\ufeff"+csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="fitness-power-${resource}.csv"`,"Cache-Control":"no-store"}});
  }catch(e){return failure(e);}
}
