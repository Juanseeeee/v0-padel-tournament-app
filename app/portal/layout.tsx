import React from "react"
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login?redirect=/portal");
  }
  if (session.rol === "admin") {
    redirect("/admin");
  }
  return <>{children}</>;
}
