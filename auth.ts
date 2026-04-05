import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
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
    Google({
      // Explicitly read credentials so both GOOGLE_CLIENT_ID and AUTH_GOOGLE_ID
      // naming conventions work — NextAuth v5 auto-reads AUTH_GOOGLE_ID only.
      clientId: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
      // Basic scopes only — contacts.readonly blocks Workspace accounts.
      // Gmail contacts sync requests it separately on the profile page.
      authorization: {
        params: {
          scope: ["openid", "profile", "email"].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    // Persist access_token + refresh_token in the JWT so API routes can use them
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose tokens to server-side API routes via auth()
      (session as typeof session & { accessToken?: string; refreshToken?: string }).accessToken =
        token.accessToken as string | undefined;
      (session as typeof session & { refreshToken?: string }).refreshToken =
        token.refreshToken as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
});
