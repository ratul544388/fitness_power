"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { authClient } from "@/lib/auth-client";
import { can, type Actor } from "@/lib/access";
import { cls } from "@/lib/utils";
import { Avatar } from "./ui";
import { LayoutDashboard, UsersRound, Dumbbell, CreditCard, ClipboardCheck, LockKeyhole, UserRoundCog, Wallet, ChartNoAxesCombined, ScrollText, Settings2, ShieldCheck, Sun, Moon, Search, ChevronDown, LogOut, Menu, X, Keyboard, Bell, Sparkles, ArrowUpRight, CircleHelp } from "lucide-react";

const ActorContext=createContext<Actor|null>(null);
export const useActor=()=>{const a=useContext(ActorContext);if(!a)throw new Error("User context missing");return a};
const NAV=[
  {group:"WORKSPACE",links:[{href:"/dashboard",label:"Overview",icon:LayoutDashboard},{href:"/members",label:"Members",icon:UsersRound},{href:"/attendance",label:"Attendance",icon:ClipboardCheck}]},
  {group:"MANAGEMENT",links:[{href:"/plans",label:"Membership Plans",icon:CreditCard},{href:"/payments",label:"Payments",icon:Wallet},{href:"/lockers",label:"Lockers",icon:LockKeyhole},{href:"/staff",label:"Staff",icon:UserRoundCog},{href:"/expenses",label:"Expenses",icon:Wallet}]},
  {group:"INSIGHTS",links:[{href:"/reports",label:"Reports & Analytics",icon:ChartNoAxesCombined},{href:"/activity",label:"Activity Log",icon:ScrollText}]},
  {group:"SYSTEM",links:[{href:"/team",label:"Team Access",icon:ShieldCheck},{href:"/settings",label:"Settings",icon:Settings2}]},
];
const allLinks=NAV.flatMap(x=>x.links);
export function Brand({withText=true}:{withText?:boolean}){return <div className="sidebar-brand"><div className="brand-icon"><Dumbbell size={24} strokeWidth={2.6}/></div>{withText&&<div className="brand-copy">FITNESS POWER<small>GYM OPERATIONS</small></div>}</div>}
export function Shell({actor,children}:{actor:Actor,children:ReactNode}){
  const pathname=usePathname(),router=useRouter(),{theme,setTheme}=useTheme();
  const [mobileOpen,setMobileOpen]=useState(false),[searchOpen,setSearchOpen]=useState(false),[search,setSearch]=useState(""),[profileOpen,setProfileOpen]=useState(false);
  const active=allLinks.find(l=>pathname===l.href)?.label||"Workspace";
  useEffect(()=>{setMobileOpen(false);setSearchOpen(false);setProfileOpen(false)},[pathname]);
  useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setSearchOpen(v=>!v)}if(e.key==="Escape")setSearchOpen(false)};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[]);
  const signOut=async()=>{if(actor.demo){router.push("/login");return;}await authClient.signOut();router.replace("/login");router.refresh()};
  const links=allLinks.filter(l=>l.label.toLowerCase().includes(search.toLowerCase())&&(!["/team","/activity"].includes(l.href)||can(actor.role,"team")));
  return <ActorContext.Provider value={actor}><div className="app-shell">
    <div className={cls("overlay-mobile",mobileOpen&&"show")} onClick={()=>setMobileOpen(false)}/>
    <aside className={cls("sidebar",mobileOpen&&"mobile-open")} aria-label="Main navigation">
      <Link href="/dashboard"><Brand/></Link>
      <div style={{flex:1,overflowY:"auto",paddingBottom:12}}>{NAV.map(group=><nav key={group.group} className="nav-group" aria-label={group.group}><div className="nav-heading">{group.group}</div>{group.links.filter(item=>!["/team","/activity"].includes(item.href)||can(actor.role,"team")).map(({href,label,icon:Icon})=><Link href={href} key={href} className={cls("nav-link",pathname===href&&"active")} title={label}><Icon size={18} strokeWidth={1.9}/><span className="nav-label">{label}</span></Link>)}</nav>)}</div>
      <div className="sidebar-end"><div className="sidebar-help"><Sparkles size={17} color="var(--accent)"/><strong>Your gym, organized.</strong><p>Everything your team needs, all in one powerful workspace.</p><Link href="/reports">Explore insights <ArrowUpRight size={11} style={{verticalAlign:"middle"}}/></Link></div><div className="sidebar-bottom"><Avatar name={actor.name} image={actor.avatar} size="md"/><div className="sidebar-user"><strong>{actor.name}</strong><span>{actor.role}</span></div><button className="icon-btn" onClick={()=>void signOut()} title="Sign out"><LogOut size={16}/></button></div></div>
    </aside>
    <div className="main-area"><header className="topbar"><div className="top-left"><button className="icon-btn mobile-only" onClick={()=>setMobileOpen(true)} aria-label="Open sidebar"><Menu size={20}/></button><span className="crumb">Workspace</span><span className="muted2">/</span><span className="crumb current">{active}</span></div><div className="top-actions"><button className="top-search" onClick={()=>{setSearch("");setSearchOpen(true)}}><Search size={15}/> Quick search <kbd>⌘ K</kbd></button><span className="top-separator"/><button className="icon-btn" onClick={()=>setTheme(theme==="dark"?"light":"dark")} aria-label="Toggle theme" title="Toggle light / dark mode"><Sun size={18} className="theme-icon-dark"/><Moon size={18} className="theme-icon-light"/></button>{can(actor.role,"team")&&<Link href="/activity" className="icon-btn" aria-label="Activity log" title="Activity log"><Bell size={17}/></Link>}<span className="top-separator"/><div style={{position:"relative"}}><button className="top-profile" onClick={()=>setProfileOpen(v=>!v)}><Avatar name={actor.name} image={actor.avatar} size="sm"/><span>{actor.name.split(" ")[0]}</span><ChevronDown size={13}/></button>{profileOpen&&<div className="row-menu" style={{top:45,right:0,minWidth:180}}><div style={{padding:"7px 9px 9px",borderBottom:"1px solid var(--border)"}}><strong style={{fontSize:11}}>{actor.name}</strong><div className="muted" style={{fontSize:10,wordBreak:"break-all"}}>{actor.email}</div></div><button onClick={()=>{router.push("/settings");setProfileOpen(false)}}><Settings2 size={15}/> Settings</button><button onClick={()=>void signOut()}><LogOut size={15}/> Sign out</button></div>}</div></div></header>
      <main className="app-content">{actor.demo&&<div className="demo-banner"><Sparkles size={16}/> Local preview mode — these are sample records stored only in memory. Connect Neon and turn DEMO_MODE off for real use.</div>}{children}</main>
    </div>
    {searchOpen&&<div className="modal-cover" onMouseDown={e=>{if(e.target===e.currentTarget)setSearchOpen(false)}} style={{alignItems:"flex-start",paddingTop:"13vh",zIndex:110}}><div className="panel" style={{width:"min(540px,calc(100vw - 32px))",padding:12,boxShadow:"var(--shadow-lg)"}}><div className="searchbox" style={{width:"100%",border:"none",background:"var(--surface2)"}}><Search size={18}/><input autoFocus placeholder="Jump to a page..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&links[0])router.push(links[0].href)}}/><kbd style={{fontSize:10}}>ESC</kbd></div><div style={{padding:6,marginTop:8}}>{links.length?links.map(l=>{const Icon=l.icon;return <button key={l.href} onClick={()=>router.push(l.href)} style={{width:"100%",display:"flex",gap:10,alignItems:"center",border:0,background:"transparent",color:"var(--text)",padding:"11px 12px",borderRadius:9,textAlign:"left",cursor:"pointer"}}><Icon size={17} color="var(--accent)"/>{l.label}<ArrowUpRight size={12} style={{marginLeft:"auto",opacity:.4}}/></button>}):<div className="muted" style={{padding:17}}>No matching pages</div>}</div><div className="muted" style={{fontSize:10,padding:"8px 12px",borderTop:"1px solid var(--border)"}}>Navigate with Enter • Close with Esc</div></div></div>}
  </div></ActorContext.Provider>;
}
