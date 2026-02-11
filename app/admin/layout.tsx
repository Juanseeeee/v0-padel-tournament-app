import React from "react"
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth("admin");

  if (!session) {
    redirect("/login");
  }

  return <>{children}</>;
}
