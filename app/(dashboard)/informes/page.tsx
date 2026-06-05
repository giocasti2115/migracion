import { auth } from "@/lib/auth"
import { InformesClient } from "./InformesClient"

export const metadata = { title: "Informes | Ziriuz" }

export default async function InformesPage() {
  await auth() // ensure session is loaded server-side
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Informes</h1>
      <InformesClient />
    </div>
  )
}
