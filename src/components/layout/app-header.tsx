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

import { useFiscalMode } from "@/providers/fiscal-mode-context"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ReceiptText, Globe } from "lucide-react"

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
  settings: "Paramètres",
  nouveau: "Nouveau",
  modifier: "Modifier",
}

export function AppHeader() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  const { fiscalMode, toggleFiscalMode } = useFiscalMode()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
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
                    <BreadcrumbPage className={fiscalMode ? "text-amber-500 font-bold" : ""}>
                      {label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-3 px-3 py-1.5 rounded-full border transition-all duration-300 ${
          fiscalMode 
            ? "bg-amber-500/10 border-amber-500/50" 
            : "bg-muted/50 border-border"
        }`}>
          <div className="flex items-center gap-2">
            {fiscalMode ? (
              <ReceiptText className="h-4 w-4 text-amber-500" />
            ) : (
              <Globe className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              fiscalMode ? "text-amber-600" : "text-muted-foreground"
            }`}>
              {fiscalMode ? "Mode Fiscal" : "Vue Globale"}
            </span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <Switch 
            checked={fiscalMode}
            onCheckedChange={toggleFiscalMode}
            className="data-[state=checked]:bg-amber-500"
          />
        </div>
      </div>
    </header>
  )
}
