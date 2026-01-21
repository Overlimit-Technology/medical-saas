import { redirect } from "next/navigation";

export default function HomePage() {
  // Send users to the real entry. Middleware will route to dashboard if a session exists.
  redirect("/login");
}
