import { getActor } from "@/lib/permissions";
import { success, failure } from "@/lib/http";
export const runtime="nodejs";
export async function GET(){try{return success(await getActor());}catch(e){return failure(e);}}
