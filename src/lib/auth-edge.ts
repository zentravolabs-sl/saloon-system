import NextAuth from "next-auth";

// Lightweight auth config for Edge middleware - no Prisma, no node-only dependencies
// JWT is verified using just the secret
export const { auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token }) {
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.salonId = token.salonId as string | null;
      }
      return session;
    },
  },
});
