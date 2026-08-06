import { redirect } from "next/navigation";

/** The app has no marketing root; `/` goes straight to the dashboard. */
export default function RootPage() {
  redirect("/dashboard");
}
