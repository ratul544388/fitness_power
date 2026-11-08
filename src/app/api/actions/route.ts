import { NextRequest } from "next/server";
import { failure, sameOrigin, success } from "@/lib/http";
import { requireActor, ApiError } from "@/lib/permissions";
import type { Permission } from "@/lib/access";
import { performAction } from "@/lib/data";
import { renewMember, checkin, checkout, assignLocker, releaseLocker } from "@/lib/validators";
export const runtime="nodejs";
export async function POST(req:NextRequest) {
  try {
    sameOrigin(req);
    const {action,data}=await req.json();
    const perms:Record<string,Permission>={renew:"members",checkin:"attendance",checkout:"attendance","locker-assign":"lockers","locker-release":"lockers"};
    if(typeof action!=="string"||!perms[action])throw new ApiError(404,"Action not found.");
    const actor=await requireActor(perms[action]);
    const validated=action==="renew"?renewMember.parse(data):action==="checkin"?checkin.parse(data):action==="checkout"?checkout.parse(data):action==="locker-assign"?assignLocker.parse(data):releaseLocker.parse(data);
    return success(await performAction(action,validated,actor));
  }catch(e){return failure(e);}
}
