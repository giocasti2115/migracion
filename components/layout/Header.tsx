"use client"

import { signOut } from "next-auth/react"
import { LogOut, User } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Breadcrumb } from "./Breadcrumb"

interface HeaderProps {
  userName: string
  userRole: string
}

function rolLabel(role: string): string {
  const map: Record<string, string> = {
    administrador: "Administrador",
    analista: "Analista",
    tecnico: "Técnico",
    coordinador: "Coordinador",
    comercial: "Comercial",
  }
  return map[role] ?? role
}

async function handleLogout() {
  // Revoke server-side tokens first, then sign out NextAuth session
  await fetch("/api/auth/logout", { method: "POST" })
  await signOut({ callbackUrl: "/login" })
}

export function Header({ userName, userRole }: HeaderProps) {
  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-6">
      <Breadcrumb />

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground">{rolLabel(userRole)}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/cambiar-clave" className="flex cursor-pointer items-center">
                <User className="mr-2 h-4 w-4" />
                Cambiar contraseña
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onSelect={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
