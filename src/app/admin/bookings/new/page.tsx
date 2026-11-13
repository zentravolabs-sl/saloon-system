import { redirect } from "next/navigation";

export default function NewBookingPage() {
  redirect("/admin/bookings?new=true");
}
