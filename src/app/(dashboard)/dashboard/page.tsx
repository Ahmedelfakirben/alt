import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Package, FileText, ShoppingCart, TrendingUp, AlertTriangle, Wallet, BarChart3 } from "lucide-react"
import Link from "next/link"

async function getStats() {
  const supabase = await createClient()

  const [clients, fournisseurs, articles, devis, bonLivraisons, bonCommandes, bonAchats, ventesPos, stock, tresoreries] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("fournisseurs").select("id", { count: "exact", head: true }),
    supabase.from("articles").select("id", { count: "exact", head: true }),
    supabase.from("devis").select("id", { count: "exact", head: true }),
    supabase.from("bon_livraisons").select("id", { count: "exact", head: true }),
    supabase.from("bon_commandes").select("id", { count: "exact", head: true }),
    supabase.from("bon_achats").select("id", { count: "exact", head: true }),
    supabase.from("ventes_pos").select("id", { count: "exact", head: true }),
    supabase.from("stock").select("quantite, article:articles(seuil_alerte)"),
    supabase.from("tresoreries").select("libelle, solde"),
  ])

  const alertesStock = stock.data?.filter((s: any) => s.quantite <= (s.article?.seuil_alerte || 0)).length || 0
  const soldeTresorerie = tresoreries.data?.reduce((s: number, t: any) => s + Number(t.solde), 0) || 0

  return {
    clients: clients.count || 0, fournisseurs: fournisseurs.count || 0, articles: articles.count || 0,
    devis: devis.count || 0, bonLivraisons: bonLivraisons.count || 0, bonCommandes: bonCommandes.count || 0,
    bonAchats: bonAchats.count || 0, ventesPos: ventesPos.count || 0, alertesStock, soldeTresorerie,
  }
}

async function getRecentDevis() {
  const supabase = await createClient()
  const { data } = await supabase.from("devis").select("id, numero, date, statut, montant_ttc, client:clients(raison_sociale)").order("created_at", { ascending: false }).limit(5)
  return data || []
}

async function getRecentVentes() {
  const supabase = await createClient()
  const { data } = await supabase.from("ventes_pos").select("id, numero, date, montant_ttc, mode_paiement").order("created_at", { ascending: false }).limit(5)
  return data || []
}

const statutColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = { brouillon: "secondary", envoye: "outline", accepte: "default", refuse: "destructive" }
const statutLabels: Record<string, string> = { brouillon: "Brouillon", envoye: "Envoyé", accepte: "Accepté", refuse: "Refusé" }
const modeLabels: Record<string, string> = { especes: "Espèces", carte: "Carte", cheque: "Chèque", virement: "Virement" }

export default async function DashboardPage() {
  const [stats, recentDevis, recentVentes] = await Promise.all([getStats(), getRecentDevis(), getRecentVentes()])

  const kpis = [
    { title: "Clients", value: stats.clients, icon: Users, color: "text-blue-600", href: "/clients" },
    { title: "Articles", value: stats.articles, icon: Package, color: "text-green-600", href: "/articles" },
    { title: "Devis", value: stats.devis, icon: FileText, color: "text-purple-600", href: "/devis" },
    { title: "Bons de livraison", value: stats.bonLivraisons, icon: TrendingUp, color: "text-cyan-600", href: "/bon-livraisons" },
    { title: "Bons de commande", value: stats.bonCommandes, icon: ShoppingCart, color: "text-orange-600", href: "/bon-commandes" },
    { title: "Ventes POS", value: stats.ventesPos, icon: BarChart3, color: "text-emerald-600", href: "/pos/ventes" },
    { title: "Alertes stock", value: stats.alertesStock, icon: AlertTriangle, color: stats.alertesStock > 0 ? "text-red-600" : "text-muted-foreground", href: "/stock" },
    { title: "Solde trésorerie", value: `${stats.soldeTresorerie.toFixed(2)} MAD`, icon: Wallet, color: "text-indigo-600", href: "/tresoreries" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Tableau de bord</h2>
        <p className="text-muted-foreground">Vue d&apos;ensemble de votre activité commerciale</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Link key={kpi.title} href={kpi.href}>
            <Card className="hover:ring-2 hover:ring-primary/20 transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Derniers devis</CardTitle></CardHeader>
          <CardContent>
            {recentDevis.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun devis pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {recentDevis.map((d: any) => (
                  <Link key={d.id} href={`/devis/${d.id}`} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{d.numero}</p>
                      <p className="text-xs text-muted-foreground">{(d.client as any)?.raison_sociale} · {new Date(d.date).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{Number(d.montant_ttc).toFixed(2)} MAD</span>
                      <Badge variant={statutColors[d.statut] || "secondary"}>{statutLabels[d.statut] || d.statut}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Dernières ventes POS</CardTitle></CardHeader>
          <CardContent>
            {recentVentes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune vente pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {recentVentes.map((v: any) => (
                  <Link key={v.id} href={`/pos/ventes/${v.id}`} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{v.numero}</p>
                      <p className="text-xs text-muted-foreground">{new Date(v.date).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{Number(v.montant_ttc).toFixed(2)} MAD</span>
                      <Badge variant="outline">{modeLabels[v.mode_paiement] || v.mode_paiement}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
