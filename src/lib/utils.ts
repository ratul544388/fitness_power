import { addMonths, format, parseISO } from "date-fns";
export function money(amount: number, currency = "BDT") {
  return `${currency === "BDT" ? "৳" : currency === "USD" ? "$" : currency + " "}${Number(amount || 0).toLocaleString("en-BD")}`;
}
export function shortDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "dd MMM yyyy");
}
export function dateInput(value?: string | null) { return value?.slice(0, 10) || ""; }
/** Return the local calendar day, not the server's UTC day (Neon/Vercel run in UTC). */
export function dateKey(date:Date,timezone="Asia/Dhaka") {
  const fields=new Intl.DateTimeFormat("en-US",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  const parts=Object.fromEntries(fields.map(x=>[x.type,x.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function todayISO(timezone="Asia/Dhaka") { return dateKey(new Date(),timezone); }
export function addPlanMonths(date: string, months: number) { return format(addMonths(parseISO(date), months), "yyyy-MM-dd"); }
export function daysUntil(value?: string | null,timezone="Asia/Dhaka") {
  if(!value)return -999;
  const a=Date.parse(`${value}T12:00:00Z`),b=Date.parse(`${todayISO(timezone)}T12:00:00Z`);
  return Math.round((a-b)/86400000);
}
export function memberStatus(row: { status?: string | null; expireDate?: string | null; archivedAt?: unknown }) {
  if (row.archivedAt || row.status === "inactive") return "inactive";
  if (row.status === "frozen") return "frozen";
  if (!row.expireDate || row.expireDate < todayISO()) return "expired";
  return "active";
}
export function initials(name?: string) { return (name || "?").trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase(); }
export function cls(...values: Array<string | false | null | undefined>) { return values.filter(Boolean).join(" "); }
