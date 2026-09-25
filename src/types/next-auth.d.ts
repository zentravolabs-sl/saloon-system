import { type DefaultSession } from "next-auth";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      salonId: string | null;
      salonSlug: string | null;
      salonName: string | null;
      salonStatus: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    salonId: string | null;
    salonSlug: string | null;
    salonName: string | null;
    salonStatus: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    salonId: string | null;
    salonSlug: string | null;
    salonName: string | null;
    salonStatus: string | null;
  }
}
