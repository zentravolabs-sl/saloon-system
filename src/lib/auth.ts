import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            staffProfile: {
              include: {
                salon: {
                  select: { id: true, slug: true, name: true, status: true },
                },
              },
            },
            ownedSalons: {
              select: { id: true, slug: true, name: true, status: true },
              take: 1,
            },
          },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        const salonId =
          user.staffProfile?.salonId || user.ownedSalons[0]?.id || null;
        const salonSlug =
          user.staffProfile?.salon?.slug ||
          user.ownedSalons[0]?.slug ||
          null;
        const salonName =
          user.staffProfile?.salon?.name ||
          user.ownedSalons[0]?.name ||
          null;
        const salonStatus =
          user.staffProfile?.salon?.status ||
          user.ownedSalons[0]?.status ||
          null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
          salonId,
          salonSlug,
          salonName,
          salonStatus,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.salonId = (user as any).salonId;
        token.salonSlug = (user as any).salonSlug;
        token.salonName = (user as any).salonName;
        token.salonStatus = (user as any).salonStatus;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.salonId = token.salonId as string | null;
        session.user.salonSlug = token.salonSlug as string | null;
        session.user.salonName = token.salonName as string | null;
        session.user.salonStatus = (token.salonStatus as string) || null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
});
