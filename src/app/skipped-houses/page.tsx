import { redirect } from "next/navigation";

export default function SkippedHousesRedirectPage() {
  redirect("/my?tab=skipped");
}
