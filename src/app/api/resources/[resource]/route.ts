import { NextRequest } from "next/server";
import { requireActor, ApiError } from "@/lib/permissions";
import type { Permission } from "@/lib/access";
import { isResource, parseCreate, parseUpdate } from "@/lib/validators";
import { createResource, deleteResource, listResource, updateResource } from "@/lib/data";
import { failure, sameOrigin, success } from "@/lib/http";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const permission:Record<string,Permission>={members:"members",plans:"plans",payments:"payments",attendance:"attendance",lockers:"lockers",expenses:"expenses",staff:"staff",team:"team",settings:"settings",audit:"team"};
type Props={params:Promise<{resource:string}>};
async function verifyResource(params:Props["params"]){const {resource}=await params;if(!isResource(resource))throw new ApiError(404,"Section not found.");return resource;}
export async function GET(_req:NextRequest,{params}:Props){try{const resource=await verifyResource(params);await requireActor(["team","audit"].includes(resource)?"team":"read");return success(await listResource(resource));}catch(e){return failure(e);}}
export async function POST(req:NextRequest,{params}:Props){try{sameOrigin(req);const resource=await verifyResource(params);const actor=await requireActor(permission[resource]);return success(await createResource(resource,parseCreate(resource,await req.json()),actor),201);}catch(e){return failure(e);}}
export async function PATCH(req:NextRequest,{params}:Props){try{sameOrigin(req);const resource=await verifyResource(params);const actor=await requireActor(permission[resource]);const {id,data}=await req.json();if(typeof id!=="string"||!id)throw new ApiError(422,"Record ID is required.");return success(await updateResource(resource,id,parseUpdate(resource,data),actor));}catch(e){return failure(e);}}
export async function DELETE(req:NextRequest,{params}:Props){try{sameOrigin(req);const resource=await verifyResource(params);const actor=await requireActor("delete");const {id}=await req.json();if(typeof id!=="string"||!id)throw new ApiError(422,"Record ID is required.");return success(await deleteResource(resource,id,actor));}catch(e){return failure(e);}}
