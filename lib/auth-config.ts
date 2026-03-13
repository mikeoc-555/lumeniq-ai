import { betterAuth } from "better-auth";
import { convexAdapter } from "better-auth/adapters/convex";

export const auth = betterAuth({
  database: convexAdapter({
    // Convex client config - uses CONVEX_URL and CONVEX_AUTH_TOKEN from env
  }),
  emailAndPassword: {
    enabled: true,
  },
});

export type Auth = typeof auth;
