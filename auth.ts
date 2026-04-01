import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import LinkedIn from "next-auth/providers/linkedin";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // Test mode — dev only, bypasses real OAuth
    ...(process.env.NODE_ENV !== "production"
      ? [
          Credentials({
            credentials: {},
            authorize() {
              return {
                id: "test-user-1",
                name: "Test User",
                email: "test@buildmapper.app",
              };
            },
          }),
        ]
      : []),
    Google,
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
    }),
    LinkedIn,
  ],
  pages: {
    signIn: "/",
  },
});
