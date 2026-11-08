import { redirect } from "next/navigation";
import { getActor } from "@/lib/permissions";
import { Shell } from "@/components/shell";
export const dynamic="force-dynamic";
export default async function DashboardLayout({children}:{children:React.ReactNode}){const actor=await getActor();if(!actor)redirect("/login");return <Shell actor={actor}>{children}</Shell>}
