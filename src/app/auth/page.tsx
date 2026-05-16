import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Celion",
  description: "Celion turns source material into editable ebooks.",
};

export default async function AuthRoute() {
  redirect("/");
}
