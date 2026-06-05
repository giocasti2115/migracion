import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: {
    default: "ZIRIUZ",
    template: "%s | ZIRIUZ",
  },
  description: "Plataforma de gestión de mantenimiento ZIRIUZ",
  keywords: ["mantenimiento", "gestión", "órdenes", "equipos", "ZIRIUZ"],
  authors: [{ name: "ZIRIUZ Team" }],
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
