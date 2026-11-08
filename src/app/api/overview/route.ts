import { requireActor } from "@/lib/permissions";
import { getOverview } from "@/lib/data";
import { failure, success } from "@/lib/http";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){try{await requireActor();return success(await getOverview());}catch(e){return failure(e);}}
