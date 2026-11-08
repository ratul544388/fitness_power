/**
 * Shared role, permission and actor definitions.
 * This module must remain safe to import from Client Components:
 * no `next/headers`, database code or server authentication here.
 */
export const roles = ["owner", "admin", "manager", "receptionist", "viewer"] as const;
export type AppRole = (typeof roles)[number];
export type Permission = "read" | "members" | "attendance" | "payments" | "lockers" | "plans" | "expenses" | "staff" | "settings" | "team" | "delete";
const privileges: Record<AppRole, Permission[]> = {
  owner: ["read","members","attendance","payments","lockers","plans","expenses","staff","settings","team","delete"],
  admin: ["read","members","attendance","payments","lockers","plans","expenses","staff","settings","team","delete"],
  manager: ["read","members","attendance","payments","lockers","plans","expenses","staff","delete"],
  receptionist: ["read","members","attendance","payments","lockers"],
  viewer: ["read"],
};
export function can(role: AppRole, permission: Permission) { return privileges[role]?.includes(permission) ?? false; }
export type Actor = { id: string; name: string; email: string; role: AppRole; avatar?: string | null; demo?: boolean };
