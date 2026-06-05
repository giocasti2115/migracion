import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import AdministracionClient from "./AdministracionClient"

export const metadata = { title: "Administración | Ziriuz" }

export default async function AdministracionPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  if (rol !== "administrador") redirect("/inicio")

  return <AdministracionClient />
}
