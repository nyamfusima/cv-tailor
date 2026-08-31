import { redirect } from "next/navigation";
import { AFTER_FAILURE_ROUTE } from "@/lib/cv/directFlow";

/** Retired: extraction review is no longer part of the normal flow. */
export default function ReviewRedirectPage() {
  redirect(AFTER_FAILURE_ROUTE);
}
