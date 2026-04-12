"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Users,
  Truck,
  Package,
  FolderTree,
  Warehouse,
  UserCog,
  Landmark,
  FileText,
  ClipboardList,
  RotateCcw,
  ShoppingCart,
  ClipboardCheck,
  PackagePlus,
  PackageMinus,
  MonitorSmartphone,
  Boxes,
  Settings,
  LogOut,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const navigation = [
  {
    label: "Général",
    items: [
      { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Données Maîtres",
    items: [
      { title: "Clients", url: "/clients", icon: Users },
      { title: "Fournisseurs", url: "/fournisseurs", icon: Truck },
      { title: "Articles", url: "/articles", icon: Package },
      { title: "Familles", url: "/familles", icon: FolderTree },
      { title: "Dépôts", url: "/depots", icon: Warehouse },
      { title: "Salariés", url: "/salaries", icon: UserCog },
      { title: "Trésoreries", url: "/tresoreries", icon: Landmark },
    ],
  },
  {
    label: "Vente",
    items: [
      { title: "Devis", url: "/devis", icon: FileText },
      { title: "Bon de livraison", url: "/bon-livraisons", icon: ClipboardList },
      { title: "Bon de retour", url: "/bon-retours", icon: RotateCcw },
    ],
  },
  {
    label: "Achat",
    items: [
      { title: "Bon de commande", url: "/bon-commandes", icon: ShoppingCart },
      { title: "Bon d'achat", url: "/bon-achats", icon: PackagePlus },
      { title: "Bon de retour", url: "/bon-retour-achats", icon: PackageMinus },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Créances Clients", url: "/finance/creances", icon: Landmark },
      { title: "Dettes Fournisseurs", url: "/finance/dettes", icon: ClipboardCheck },
      { title: "Comptabilité", url: "/finance/comptabilite", icon: FileText },
    ],
  },
  {
    label: "Opérations",
    items: [
      { title: "Point de vente", url: "/pos/ventes", icon: MonitorSmartphone },
      { title: "Stock", url: "/stock", icon: Boxes },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          {/* Logo added */}
          <div className="h-16 w-16 overflow-hidden rounded-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpeg" alt="Logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-xl font-bold text-accent">
            Digital ALT
          </h1>
        </Link>
        <p className="text-xs text-muted-foreground">Gestion Commerciale</p>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url || pathname.startsWith(item.url + "/")}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith("/settings")}
            >
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Paramètres</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span>Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
