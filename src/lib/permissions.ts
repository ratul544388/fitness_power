/**
 * Server-side authentication and access verification.
 * Import shared access helpers from `@/lib/access` in Client Components.
 */
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { can, roles, type Actor, type AppRole, type Permission } from "./access";

export const demoEnabled = () => process.env.NODE_ENV === "development" && process.env.DEMO_MODE === "true";
export async function getActor(): Promise<Actor | null> {
  if (demoEnabled()) return { id: "demo-owner", name: "Alex Morgan", email: "demo@fitnesspower.local", role: "owner", demo: true };
  const sess = await auth.api.getSession({ headers: await headers() });
  if (!sess) return null;
  // Read role from the database, not from client-controlled cookies or an outdated token.
  const [record] = await db.select({ appRole: user.appRole, banned: user.banned, image: user.image }).from(user).where(eq(user.id, sess.user.id)).limit(1);
  if (!record || record.banned) return null;
  const role = roles.includes(record.appRole as AppRole) ? record.appRole as AppRole : "viewer";
  return { id: sess.user.id, name: sess.user.name, email: sess.user.email, role, avatar: record.image };
}
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function requireActor(permission: Permission = "read") {
  const actor = await getActor();
  if (!actor) throw new ApiError(401, "Please sign in to continue.");
  if (!can(actor.role, permission)) throw new ApiError(403, "Your role does not have permission for this action.");
  return actor;
}
