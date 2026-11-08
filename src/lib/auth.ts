import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  appName: "Fitness Power",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || (process.env.NODE_ENV === "development" ? "local-preview-only-change-this-secret-before-deploy-2026" : undefined),
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
  user: {
    additionalFields: {
      appRole: { type: "string", defaultValue: "viewer", input: false },
    },
  },
  plugins: [nextCookies()],
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
});
