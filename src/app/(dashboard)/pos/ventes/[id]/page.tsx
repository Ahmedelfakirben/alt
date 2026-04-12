"use client"

import { useParams } from "next/navigation"
import { useVentePos } from "@/hooks/use-ventes-pos"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"

const modeLabels: Record<string, string> = { especes: "Espèces", carte: "Carte", cheque: "Chèque", virement: "Virement" }

export default function VentePosDetailPage() {
    const params = useParams()
    const id = params.id as string
    const { data: vente, isLoading } = useVentePos(id)
    if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>
    if (!vente) return <p>Vente introuvable</p>
    return (
        <div className="space-y-6">
            <div><h2 className="text-3xl font-bold tracking-tight">Vente {vente.numero}</h2><p className="text-muted-foreground">{new Date(vente.date).toLocaleDateString("fr-FR")}</p></div>
            <div className="grid gap-4 md:grid-cols-4">
                <Card><CardHeader><CardTitle>Client</CardTitle></CardHeader><CardContent><p className="font-semibold">{vente.client?.raison_sociale || "Comptoir"}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Paiement</CardTitle></CardHeader><CardContent><Badge variant="outline">{modeLabels[vente.mode_paiement]}</Badge></CardContent></Card>
                <Card><CardHeader><CardTitle>Trésorerie</CardTitle></CardHeader><CardContent><p>{vente.tresorerie?.libelle || "—"}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Montant TTC</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{Number(vente.montant_ttc).toFixed(2)} MAD</p></CardContent></Card>
            </div>
            <Card><CardHeader><CardTitle>Articles vendus</CardTitle></CardHeader><CardContent><div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Désignation</TableHead><TableHead className="w-[100px]">Qté</TableHead><TableHead className="w-[120px]">Prix unit.</TableHead><TableHead className="w-[80px]">TVA</TableHead><TableHead className="w-[120px] text-right">Montant HT</TableHead></TableRow></TableHeader><TableBody>{vente.lignes?.map((l) => (<TableRow key={l.id}><TableCell>{l.designation}</TableCell><TableCell>{l.quantite}</TableCell><TableCell>{Number(l.prix_unitaire).toFixed(2)} MAD</TableCell><TableCell>{l.tva}%</TableCell><TableCell className="text-right font-medium">{Number(l.montant_ht).toFixed(2)} MAD</TableCell></TableRow>))}</TableBody><TableFooter><TableRow><TableCell colSpan={4} className="text-right">Total HT</TableCell><TableCell className="text-right font-bold">{Number(vente.montant_ht).toFixed(2)} MAD</TableCell></TableRow><TableRow><TableCell colSpan={4} className="text-right">TVA</TableCell><TableCell className="text-right font-bold">{Number(vente.montant_tva).toFixed(2)} MAD</TableCell></TableRow><TableRow><TableCell colSpan={4} className="text-right text-lg">Total TTC</TableCell><TableCell className="text-right font-bold text-lg">{Number(vente.montant_ttc).toFixed(2)} MAD</TableCell></TableRow></TableFooter></Table></div></CardContent></Card>
        </div>
    )
}
