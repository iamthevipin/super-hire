import { redirect } from "next/navigation";

// Temporary redirect until the landing page is built in a later phase.
export default function Home() {
  redirect("/signup");
}
