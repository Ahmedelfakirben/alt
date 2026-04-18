"use client"

import { useParams } from "next/navigation"
import { useBonLivraison } from "@/hooks/use-bon-livraisons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Pencil } from "lucide-react"
import Link from "next/link"
import { PrintDocumentButton } from "@/components/documents/print-document-button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { PaymentSection } from "@/components/finance/payment-section"

const statutColors: Record<string, "default" | "secondary" | "destructive"> = { brouillon: "secondary", valide: "default", annule: "destructive" }
const statutLabels: Record<string, string> = { brouillon: "Brouillon", valide: "Validé", annule: "Annulé" }

export default function BonLivraisonDetailPage() {
    const params = useParams()
    const id = params.id as string
    const { data: bl, isLoading } = useBonLivraison(id)

    if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>
    if (!bl) return <p>Bon de livraison introuvable</p>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h2 className="text-3xl font-bold tracking-tight">BL {bl.numero}</h2><p className="text-muted-foreground">Créé le {new Date(bl.created_at).toLocaleDateString("fr-FR")}</p></div>
                <div className="flex items-center gap-2">
                    <Badge variant={statutColors[bl.statut] || "secondary"}>{statutLabels[bl.statut] || bl.statut}</Badge>
                    <PrintDocumentButton type="bon_livraison" document={bl} />
                    <Button asChild><Link href={`/bon-livraisons/${bl.id}/modifier`}><Pencil className="mr-2 h-4 w-4" />Modifier</Link></Button>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader><CardTitle>Client</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <p className="font-semibold">{bl.client?.raison_sociale}</p>
                        <p className="text-sm text-muted-foreground">{bl.client?.code}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Détails</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <div><span className="text-sm text-muted-foreground">Date</span><p>{new Date(bl.date).toLocaleDateString("fr-FR")}</p></div>
                        <div><span className="text-sm text-muted-foreground">Dépôt</span><p>{(bl as any).depot?.libelle || "—"}</p></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Montants</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <div><span className="text-sm text-muted-foreground">{bl.inclure_tva ? "HT" : "Montant Total"}</span><p>{Number(bl.montant_ht).toFixed(2)} MAD</p></div>
                        {bl.inclure_tva && (
                            <div><span className="text-sm text-muted-foreground">TVA</span><p>{Number(bl.montant_tva).toFixed(2)} MAD</p></div>
                        )}
                        <div><span className="text-sm text-muted-foreground">Net à Payer</span><p className="text-lg font-bold">{Number(bl.montant_ttc).toFixed(2)} MAD</p></div>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader><CardTitle>Lignes</CardTitle></CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                             <TableHeader><TableRow><TableHead>Désignation</TableHead><TableHead className="w-[100px]">Qté</TableHead><TableHead className="w-[120px]">Prix unit.</TableHead>{bl.inclure_tva && <TableHead className="w-[80px]">TVA</TableHead>}<TableHead className="w-[120px] text-right">{bl.inclure_tva ? "Montant HT" : "Montant Total"}</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {bl.lignes?.map((l) => (
                                    <TableRow key={l.id}><TableCell>{l.designation}</TableCell><TableCell>{l.quantite}</TableCell><TableCell>{Number(l.prix_unitaire).toFixed(2)} MAD</TableCell>{bl.inclure_tva && <TableCell>{l.tva}%</TableCell>}<TableCell className="text-right font-medium">{Number(l.montant_ht).toFixed(2)} MAD</TableCell></TableRow>
                                ))}
                            </TableBody>
                             <TableFooter>
                                 <TableRow><TableCell colSpan={bl.inclure_tva ? 4 : 3} className="text-right">{bl.inclure_tva ? "Total HT" : "Montant Total"}</TableCell><TableCell className="text-right font-bold">{Number(bl.montant_ht).toFixed(2)} MAD</TableCell></TableRow>
                                {bl.inclure_tva && (
                                    <TableRow><TableCell colSpan={4} className="text-right">TVA</TableCell><TableCell className="text-right font-bold">{Number(bl.montant_tva).toFixed(2)} MAD</TableCell></TableRow>
                                )}
                                 <TableRow><TableCell colSpan={bl.inclure_tva ? 4 : 3} className="text-right text-lg">Net à Payer</TableCell><TableCell className="text-right font-bold text-lg">{Number(bl.montant_ttc).toFixed(2)} MAD</TableCell></TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </CardContent>
            </Card>
            {bl.notes && <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent><p>{bl.notes}</p></CardContent></Card>}

            <PaymentSection
                referenceType="bon_livraison"
                referenceId={bl.id}
                montantTTC={bl.montant_ttc}
                montantRegle={bl.montant_regle || 0}
                statutPaiement={bl.statut_paiement || "impaye"}
            />
        </div>
    )
}
