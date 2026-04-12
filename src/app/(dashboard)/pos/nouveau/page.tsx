"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useCreateVentePos } from "@/hooks/use-ventes-pos"
import { useTresoreries } from "@/hooks/use-tresoreries"
import { useDepots } from "@/hooks/use-depots"
import { useClients } from "@/hooks/use-clients"
import type { Article } from "@/types/database"
import type { VentePosLigneFormData } from "@/lib/validations/operations"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Minus, Plus, ShoppingCart, Trash2, Search, CreditCard, Banknote, X } from "lucide-react"
import { toast } from "sonner"

interface CartItem extends VentePosLigneFormData {
    code: string
}

export default function PosNouveauPage() {
    const supabase = createClient()
    const { data: articles, isLoading } = useQuery({
        queryKey: ["articles-active-pos"],
        queryFn: async () => {
            const { data, error } = await supabase.from("articles").select("*, famille:familles_articles(*)").eq("actif", true).order("designation")
            if (error) throw error
            return data as Article[]
        },
    })
    const { data: tresoreries } = useTresoreries()
    const { data: depots } = useDepots()
    const { data: clients } = useClients()
    const createVente = useCreateVentePos()

    const [cart, setCart] = useState<CartItem[]>([])
    const [search, setSearch] = useState("")
    const [tresorerieId, setTresorerieId] = useState("")
    const [depotId, setDepotId] = useState("")
    const [clientId, setClientId] = useState("")
    const [modePaiement, setModePaiement] = useState<"especes" | "carte" | "cheque" | "virement">("especes")

    const filteredArticles = useMemo(() =>
        articles?.filter((a) => a.designation.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase())) || [],
        [articles, search]
    )

    const addToCart = (article: Article) => {
        setCart((prev) => {
            const existing = prev.find((c) => c.article_id === article.id)
            if (existing) {
                return prev.map((c) => c.article_id === article.id ? { ...c, quantite: c.quantite + 1, montant_ht: (c.quantite + 1) * c.prix_unitaire } : c)
            }
            return [...prev, { article_id: article.id, code: article.code, designation: article.designation, quantite: 1, prix_unitaire: article.prix_vente, tva: article.tva, montant_ht: article.prix_vente }]
        })
    }

    const updateQty = (article_id: string, delta: number) => {
        setCart((prev) => prev.map((c) => {
            if (c.article_id !== article_id) return c
            const newQty = Math.max(0, c.quantite + delta)
            return { ...c, quantite: newQty, montant_ht: newQty * c.prix_unitaire }
        }).filter((c) => c.quantite > 0))
    }

    const removeItem = (article_id: string) => setCart((prev) => prev.filter((c) => c.article_id !== article_id))

    const totalHT = cart.reduce((s, c) => s + c.montant_ht, 0)
    const totalTVA = cart.reduce((s, c) => s + c.montant_ht * (c.tva / 100), 0)
    const totalTTC = totalHT + totalTVA

    const handleFinalize = async () => {
        if (cart.length === 0) { toast.error("Le panier est vide"); return }
        if (!tresorerieId) { toast.error("Sélectionnez une trésorerie"); return }
        if (!depotId) { toast.error("Sélectionnez un dépôt"); return }

        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user?.id || "").single() as any

            await createVente.mutateAsync({
                formData: {
                    client_id: clientId || null,
                    tresorerie_id: tresorerieId,
                    depot_id: depotId,
                    mode_paiement: modePaiement,
                    lignes: cart.map(({ code, ...ligne }) => ligne),
                },
                commercial_id: profile?.id || "",
            })
            toast.success("Vente enregistrée !")
            setCart([])
        } catch { toast.error("Erreur lors de l'enregistrement") }
    }

    if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>

    return (
        <div className="flex gap-6 h-[calc(100vh-8rem)]">
            {/* Articles panel */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="mb-4"><h2 className="text-3xl font-bold tracking-tight">Point de vente</h2></div>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Rechercher un article..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
                </div>
                <div className="flex-1 overflow-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-min">
                    {filteredArticles.map((a) => (
                        <Card key={a.id} className="cursor-pointer hover:ring-2 hover:ring-primary transition-shadow" onClick={() => addToCart(a)}>
                            <CardContent className="p-3">
                                <p className="font-medium text-sm truncate">{a.designation}</p>
                                <p className="text-xs text-muted-foreground">{a.code}</p>
                                <p className="text-sm font-bold mt-1">{a.prix_vente.toFixed(2)} MAD</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Cart panel */}
            <Card className="w-[380px] flex flex-col shrink-0">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Panier ({cart.length})</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
                    <div className="grid grid-cols-2 gap-2">
                        <Select value={depotId} onValueChange={setDepotId}><SelectTrigger className="text-xs"><SelectValue placeholder="Dépôt" /></SelectTrigger><SelectContent>{depots?.map((d) => <SelectItem key={d.id} value={d.id}>{d.libelle}</SelectItem>)}</SelectContent></Select>
                        <Select value={tresorerieId} onValueChange={setTresorerieId}><SelectTrigger className="text-xs"><SelectValue placeholder="Trésorerie" /></SelectTrigger><SelectContent>{tresoreries?.map((t) => <SelectItem key={t.id} value={t.id}>{t.libelle}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <Select value={clientId} onValueChange={setClientId}><SelectTrigger className="text-xs"><SelectValue placeholder="Client (optionnel)" /></SelectTrigger><SelectContent><SelectItem value="none">Comptoir</SelectItem>{clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.raison_sociale}</SelectItem>)}</SelectContent></Select>

                    <div className="flex-1 overflow-auto space-y-2">
                        {cart.map((item) => (
                            <div key={item.article_id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{item.designation}</p><p className="text-xs text-muted-foreground">{item.prix_unitaire.toFixed(2)} MAD × {item.quantite}</p></div>
                                <div className="flex items-center gap-1">
                                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.article_id, -1)}><Minus className="h-3 w-3" /></Button>
                                    <span className="text-sm font-bold w-6 text-center">{item.quantite}</span>
                                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.article_id, 1)}><Plus className="h-3 w-3" /></Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.article_id)}><X className="h-3 w-3" /></Button>
                                </div>
                            </div>
                        ))}
                        {cart.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Panier vide</p>}
                    </div>

                    <div className="border-t pt-3 space-y-2">
                        <div className="flex justify-between text-sm"><span>Sous-total HT</span><span>{totalHT.toFixed(2)} MAD</span></div>
                        <div className="flex justify-between text-sm"><span>TVA</span><span>{totalTVA.toFixed(2)} MAD</span></div>
                        <div className="flex justify-between text-lg font-bold"><span>Total TTC</span><span>{totalTTC.toFixed(2)} MAD</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button variant={modePaiement === "especes" ? "default" : "outline"} size="sm" onClick={() => setModePaiement("especes")} className="gap-1"><Banknote className="h-3 w-3" />Espèces</Button>
                        <Button variant={modePaiement === "carte" ? "default" : "outline"} size="sm" onClick={() => setModePaiement("carte")} className="gap-1"><CreditCard className="h-3 w-3" />Carte</Button>
                    </div>

                    <Button className="w-full" size="lg" onClick={handleFinalize} disabled={createVente.isPending || cart.length === 0}>
                        {createVente.isPending ? "Enregistrement..." : `Encaisser ${totalTTC.toFixed(2)} MAD`}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
