import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
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
  ],
  pages: {
    signIn: "/",
  },
});
