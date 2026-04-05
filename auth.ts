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
    Google({
      // Request contacts.readonly so we can sync Google contacts for
      // relationship intelligence. Users see the permission on sign-in.
      authorization: {
        params: {
          scope: [
            "openid",
            "profile",
            "email",
            "https://www.googleapis.com/auth/contacts.readonly",
          ].join(" "),
          access_type: "offline", // get refresh_token for background syncs
          prompt: "consent",      // force consent screen so refresh_token is issued
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
