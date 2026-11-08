"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { can } from "@/lib/access";
import { useActor } from "./shell";
import { command, actionCommand, useResource, exportCSV } from "./hooks";
import { Avatar, Badge, Button, DataTable, Empty, ErrorState, PageHead, PersonCell, SearchBox, SkeletonPage, type RowData } from "./ui";
import { SmartForm, type Field } from "./forms";
import { memberStatus, shortDate } from "@/lib/utils";
import { Download, Plus, ClipboardCheck, Clock, LogOut, UsersRound, Timer, UserRoundCheck, Activity, CalendarDays, ArrowRight } from "lucide-react";

export function AttendancePage(){
  const actor=useActor(),writable=can(actor.role,"attendance"),query=useSearchParams();
  const {rows,error,isLoading,mutate}=useResource<RowData[]>("attendance"),{rows:members}=useResource<RowData[]>("members");
  const [search,setSearch]=useState(""),[filter,setFilter]=useState("all"),[form,setForm]=useState(false);
  useEffect(()=>{if(query.get("new")==="1"&&writable)setForm(true)},[query,writable]);
  const filtered=rows.filter((r:RowData)=>(filter==="all"||filter==="inside"&&!r.checkedOutAt||filter==="completed"&&r.checkedOutAt)&&[r.memberName,r.memberNo].some(v=>String(v||"").toLowerCase().includes(search.toLowerCase())));
  const activeVisits=rows.filter((r:RowData)=>!r.checkedOutAt);
  const today=rows.filter((r:RowData)=>new Date(r.checkedInAt).toDateString()===new Date().toDateString());
  const checkOut=async(r:RowData)=>{try{await actionCommand("checkout",{attendanceId:r.id},`${r.memberName} checked out`)}catch{}};
  if(isLoading)return <SkeletonPage/>;if(error)return <ErrorState message={error.message} retry={()=>void mutate()}/>;
  return <div><PageHead eyebrow="VISITS & ACCESS" title="Attendance" subtitle="Keep track of gym check-ins, live occupancy, and member visits." actions={<><Button onClick={()=>exportCSV("attendance")}><Download size={15}/> Export</Button>{writable&&<Button variant="primary" onClick={()=>setForm(true)}><Plus size={15}/> Check in member</Button>}</>}/>
    <div className="small-summary"><div className="panel"><small>Inside right now</small><strong className="positive">{activeVisits.length}</strong></div><div className="panel"><small>Today's check-ins</small><strong>{today.length}</strong></div><div className="panel"><small>Recorded visits</small><strong>{rows.length}</strong></div></div>
    <div className="toolbar"><div className="toolbar-left"><SearchBox value={search} onChange={setSearch} placeholder="Search member or ID..."/><select className="select" style={{width:160}} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All visits</option><option value="inside">Currently inside</option><option value="completed">Completed visits</option></select></div><div className="toolbar-right"><span className="muted font-xs">{filtered.length} records</span></div></div>
    <DataTable rows={filtered} columns={[{key:"memberName",title:"Member",render:r=><PersonCell name={r.memberName} image={r.memberImage} subtitle={`#${r.memberNo}`}/>},{key:"checkedInAt",title:"Check-in",render:r=><div><strong>{new Date(r.checkedInAt).toLocaleTimeString("en-BD",{hour:"2-digit",minute:"2-digit"})}</strong><div className="muted font-xs">{shortDate(r.checkedInAt)}</div></div>},{key:"checkedOutAt",title:"Check-out",render:r=>r.checkedOutAt?new Date(r.checkedOutAt).toLocaleTimeString("en-BD",{hour:"2-digit",minute:"2-digit"}):<span className="muted">—</span>},{key:"source",title:"Source",render:r=><span style={{textTransform:"capitalize"}}>{r.source}</span>},{key:"status",title:"Visit",render:r=><Badge status={r.checkedOutAt?"inactive":"active"} text={r.checkedOutAt?"Completed":"Inside"}/>}]} actions={writable?(r:RowData)=>!r.checkedOutAt?<Button size="sm" onClick={()=>void checkOut(r)}><LogOut size={14}/> Check out</Button>:<span className="muted font-xs">Complete</span>:undefined} emptyTitle="No visits to display"/>
    <SmartForm open={form} onClose={()=>setForm(false)} title="Check in a member" description="Members with expired or frozen memberships cannot be checked in." fields={[{name:"memberId",label:"Member",type:"select",options:members.filter((m:RowData)=>memberStatus(m)==="active").map((m:RowData)=>({value:m.id,label:`#${m.memberNo} — ${m.name}`})),required:true,full:true}]} initial={{memberId:""}} submitLabel="Check in" onSubmit={async data=>actionCommand("checkin",data,"Member checked in")}/>
  </div>;
}
