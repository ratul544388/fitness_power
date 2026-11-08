"use client";
import useSWR, {mutate as globalMutate} from "swr";
import { toast } from "sonner";
import { money as formatMoney } from "@/lib/utils";

export async function api<T=any>(url:string,init?:RequestInit):Promise<T>{
  const res=await fetch(url,{credentials:"same-origin",cache:"no-store",...init,headers:{...(init?.body && !(init.body instanceof FormData)?{"Content-Type":"application/json"}:{}),...init?.headers}});
  const json=await res.json().catch(()=>({error:`Request failed: ${res.status}`}));
  if(!res.ok)throw new Error(json.error||`HTTP ${res.status}`);
  return json.data as T;
}
/** Keep the rows value typed as the requested array rather than T | never[].
 * The latter creates incompatible overload unions for Array.reduce in strict TS. */
export function useResource<T extends unknown[] = Record<string, unknown>[]>(resource:string){
  const endpoint=`/api/resources/${resource}`;
  const s=useSWR<T>(endpoint,api,{revalidateOnFocus:false,dedupingInterval:10000});
  const rows: T = Array.isArray(s.data) ? s.data as T : [] as unknown as T;
  return {...s,rows,reload:()=>s.mutate()};
}
export function useOverview(){return useSWR<any>("/api/overview",api,{refreshInterval:60000,revalidateOnFocus:true});}
export async function command(resource:string,method:"POST"|"PATCH"|"DELETE",body:unknown,successMessage="Changes saved"){
  try {const result=await api(`/api/resources/${resource}`,{method,body:JSON.stringify(body)});await Promise.all([globalMutate(`/api/resources/${resource}`),globalMutate("/api/overview")]);toast.success(successMessage);return result;}
  catch(err){toast.error(err instanceof Error?err.message:"Request failed");throw err;}
}
export async function actionCommand(action:string,data:unknown,successMessage="Done"){
  try {const result=await api("/api/actions",{method:"POST",body:JSON.stringify({action,data})});await Promise.all(["members","lockers","payments","attendance","plans"].map(r=>globalMutate(`/api/resources/${r}`)).concat([globalMutate("/api/overview")]));toast.success(successMessage);return result;}
  catch(err){toast.error(err instanceof Error?err.message:"Request failed");throw err;}
}
export function exportCSV(resource:string){window.location.assign(`/api/export/${resource}`)}

/** Currency selection is persisted in the gym settings record. */
export function useMoney(){
  const {data}=useSWR<any[]>("/api/resources/settings",api,{revalidateOnFocus:false,dedupingInterval:10000});
  const currency=data?.[0]?.currency||"BDT";
  return (amount:number)=>formatMoney(amount,currency);
}
