import { betterAuth } from "better-auth";

// Simple auth config without database adapter for MVP
// Can be upgraded later with proper adapter
export const auth = betterAuth({
  // Database adapter can be added later when Convex integration is ready
  // For now, using in-memory session storage for development
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});

export type Auth = typeof auth;
