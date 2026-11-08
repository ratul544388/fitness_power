import { notFound } from "next/navigation";
import { AppPage } from "@/components/app-page";
const sections=["dashboard","members","attendance","plans","payments","lockers","staff","expenses","reports","activity","team","settings"] as const;
type Section=typeof sections[number];
export const dynamic="force-dynamic";
export default async function SectionPage({params}:{params:Promise<{section:string}>}){const {section}=await params;if(!sections.includes(section as Section))notFound();return <AppPage section={section as Section}/>}
