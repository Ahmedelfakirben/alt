"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { usePathname } from "next/navigation"

const routeLabels: Record<string, string> = {
  dashboard: "Tableau de bord",
  clients: "Clients",
  fournisseurs: "Fournisseurs",
  articles: "Articles",
  familles: "Familles",
  depots: "Dépôts",
  salaries: "Salariés",
  tresoreries: "Trésoreries",
  vente: "Vente",
  devis: "Devis",
  "bon-livraison": "Bon de livraison",
  "bon-retour": "Bon de retour",
  achat: "Achat",
  "bon-commande": "Bon de commande",
  "bon-achat": "Bon d'achat",
  "bon-retour-achat": "Bon de retour d'achat",
  pos: "Point de vente",
  stock: "Stock",
  parametres: "Paramètres",
  nouveau: "Nouveau",
  modifier: "Modifier",
}

export function AppHeader() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {segments.map((segment, index) => {
            const isLast = index === segments.length - 1
            const href = "/" + segments.slice(0, index + 1).join("/")
            const label = routeLabels[segment] || segment

            return (
              <BreadcrumbItem key={href}>
                {index > 0 && <BreadcrumbSeparator />}
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  )
}
