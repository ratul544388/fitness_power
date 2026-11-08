import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "./permissions";

export function sameOrigin(request:Request) {
  const origin=request.headers.get("origin");
  if(!origin)return;
  const actual=new URL(request.url);
  const expected=new URL(process.env.BETTER_AUTH_URL||actual.origin);
  // The origin is required to match the served application (not an attacker site).
  if(origin!==expected.origin)throw new ApiError(403,"Cross-origin changes are not allowed.");
}
export function success(data:unknown,status=200) {return NextResponse.json({data},{status,headers:{"Cache-Control":"no-store"}});}
export function failure(error:unknown) {
  if(error instanceof ApiError)return NextResponse.json({error:error.message},{status:error.status});
  if(error instanceof ZodError)return NextResponse.json({error:error.issues.map(issue=>`${issue.path.join(".")}: ${issue.message}`).join("; ")},{status:422});
  const message=error instanceof Error?error.message:"Unexpected server error";
  console.error("[Fitness Power API]",error);
  // Do not expose SQL, stack traces, secrets or infrastructure details to users.
  if(message.includes("DATABASE_URL")||message.includes("ECONN")||message.includes("connect"))return NextResponse.json({error:"Database unavailable. Check DATABASE_URL and Neon availability."},{status:503});
  return NextResponse.json({error:"Something went wrong. Please retry or contact your administrator."},{status:500});
}
