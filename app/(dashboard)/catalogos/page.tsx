import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import CatalogosClient from "./CatalogosClient"

export const metadata = { title: "Catálogos | Ziriuz" }

export default async function CatalogosPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const rol = (session.user as { role?: string }).role ?? "tecnico"
  const canEdit = rol === "administrador"

  return <CatalogosClient canEdit={canEdit} />
}
