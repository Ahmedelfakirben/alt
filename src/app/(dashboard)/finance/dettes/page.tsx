"use client"

import { useState } from "react"
import { useFournisseurs } from "@/hooks/use-fournisseurs"
import { useBonCommandesByFournisseur } from "@/hooks/use-bon-commandes"
import { useBonAchatsByFournisseur } from "@/hooks/use-bon-achats"
import { DataTable } from "@/components/data-table/data-table"
import { ColumnDef } from "@tanstack/react-table"
import type { BonCommande, BonAchat } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    paye: "default",
    partiel: "secondary",
    impaye: "destructive",
    brouillon: "secondary",
    valide: "default"
}

export default function EtatFournisseurPage() {
    const { data: fournisseurs, isLoading: loadingFournisseurs } = useFournisseurs()
    const [selectedFournisseurId, setSelectedFournisseurId] = useState<string>("")

    const { data: commandes, isLoading: loadingCommandes } = useBonCommandesByFournisseur(selectedFournisseurId)
    const { data: achats, isLoading: loadingAchats } = useBonAchatsByFournisseur(selectedFournisseurId)

    const commandesColumns: ColumnDef<BonCommande>[] = [
        { accessorKey: "date", header: "Date", cell: ({ row }) => new Date(row.original.date).toLocaleDateString("fr-FR") },
        { accessorKey: "numero", header: "N° BC" },
        { accessorKey: "montant_ttc", header: "Total TTC", cell: ({ row }) => <span className="font-medium">{Number(row.original.montant_ttc).toFixed(2)}</span> },
        { accessorKey: "statut", header: "Statut", cell: ({ row }) => <Badge variant={statusColors[row.original.statut] || "outline"}>{row.original.statut}</Badge> },
        {
            id: "actions",
            cell: ({ row }) => (
                <Button asChild variant="ghost" size="sm">
                    <Link href={`/bon-commandes/${row.original.id}`}><Eye className="h-4 w-4 mr-2" />Voir</Link>
                </Button>
            ),
        },
    ]

    const achatsColumns: ColumnDef<BonAchat>[] = [
        { accessorKey: "date", header: "Date", cell: ({ row }) => new Date(row.original.date).toLocaleDateString("fr-FR") },
        { accessorKey: "numero", header: "N° BA / Facture" },
        { accessorKey: "montant_ttc", header: "Total TTC", cell: ({ row }) => <span className="font-medium">{Number(row.original.montant_ttc).toFixed(2)}</span> },
        { accessorKey: "montant_regle", header: "Réglé", cell: ({ row }) => <span className="text-muted-foreground">{Number(row.original.montant_regle || 0).toFixed(2)}</span> },
        {
            id: "reste", header: "Reste", cell: ({ row }) => {
                const reste = Number(row.original.montant_ttc) - Number(row.original.montant_regle || 0)
                return <span className={`font-bold ${reste > 0 ? "text-destructive" : ""}`}>{reste.toFixed(2)}</span>
            }
        },
        { accessorKey: "statut_paiement", header: "Statut", cell: ({ row }) => <Badge variant={statusColors[row.original.statut_paiement || "impaye"] || "outline"} className="capitalize">{row.original.statut_paiement || "impaye"}</Badge> },
        {
            id: "actions",
            cell: ({ row }) => (
                <Button asChild variant="ghost" size="sm">
                    <Link href={`/bon-achats/${row.original.id}`}><Eye className="h-4 w-4" /></Link>
                </Button>
            ),
        },
    ]

    if (loadingFournisseurs) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /></div>

    const achatsPayes = achats?.filter(a => a.statut_paiement === "paye" || a.statut_paiement === "partiel" && Number(a.montant_regle) > 0) || []
    const impayes = achats?.filter(a => !a.statut_paiement || a.statut_paiement === "impaye" || (a.statut_paiement === "partiel" && Number(a.montant_ttc) > Number(a.montant_regle || 0))) || []

    const historiqueGlobal = [
        ...(commandes || []).map(c => ({ ...c, doc_type: "Commande", num: c.numero, montant: c.montant_ttc, date_val: new Date(c.date) })),
        ...(achats || []).map(a => ({ ...a, doc_type: "Achat/Facture", num: a.numero, montant: a.montant_ttc, date_val: new Date(a.date) }))
    ].sort((a, b) => b.date_val.getTime() - a.date_val.getTime())

    const totalImpaye = impayes.reduce((acc, curr) => acc + (Number(curr.montant_ttc) - Number(curr.montant_regle || 0)), 0)
    const fournisseurActuel = fournisseurs?.find(f => f.id === selectedFournisseurId)

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">État du Fournisseur</h2>
                    <p className="text-muted-foreground">Gestion complète du dossier fournisseur</p>
                </div>
                <div className="w-full md:w-[300px]">
                    <Select value={selectedFournisseurId} onValueChange={setSelectedFournisseurId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un fournisseur..." />
                        </SelectTrigger>
                        <SelectContent>
                            {fournisseurs?.map(f => (
                                <SelectItem key={f.id} value={f.id}>{f.code} - {f.raison_sociale}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {selectedFournisseurId ? (
                <>
                    <div className="grid gap-4 md:grid-cols-3 mb-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Informations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{fournisseurActuel?.raison_sociale}</div>
                                <p className="text-xs text-muted-foreground mt-1">Code: {fournisseurActuel?.code}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Volume des Achats</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {(achats?.reduce((acc, a) => acc + Number(a.montant_ttc), 0) || 0).toFixed(2)} MAD
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Total facturé</p>
                            </CardContent>
                        </Card>
                        <Card className="border-destructive">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-destructive">Dettes (Impayés)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-destructive">{totalImpaye.toFixed(2)} MAD</div>
                                <p className="text-xs text-muted-foreground mt-1">Total restant dû</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="impayes" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="impayes">Dettes</TabsTrigger>
                            <TabsTrigger value="achats">Achats Payés</TabsTrigger>
                            <TabsTrigger value="commandes">Commandes</TabsTrigger>
                            <TabsTrigger value="historique">Historique</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="impayes" className="mt-6">
                            <Card>
                                <CardHeader><CardTitle>Factures Impayées</CardTitle></CardHeader>
                                <CardContent>
                                    <DataTable columns={achatsColumns} data={impayes} searchPlaceholder="Chercher..." />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="achats" className="mt-6">
                            <Card>
                                <CardHeader><CardTitle>Factures / B.A. Payés</CardTitle></CardHeader>
                                <CardContent>
                                    <DataTable columns={achatsColumns} data={achatsPayes} searchPlaceholder="Chercher..." />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="commandes" className="mt-6">
                            <Card>
                                <CardHeader><CardTitle>Commandes au fournisseur</CardTitle></CardHeader>
                                <CardContent>
                                    <DataTable columns={commandesColumns} data={commandes || []} searchPlaceholder="Chercher..." />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="historique" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Historique Récent</CardTitle>
                                    <CardDescription>Tous les documents générés depuis la création du compte fournisseur.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {historiqueGlobal.map((doc, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg">
                                            <div>
                                                <Badge variant="outline" className="mb-2">{doc.doc_type}</Badge>
                                                <p className="font-medium">{doc.num}</p>
                                                <p className="text-sm text-muted-foreground">{doc.date_val.toLocaleDateString("fr-FR")}</p>
                                            </div>
                                            <div className="flex flex-col items-end mt-2 sm:mt-0">
                                                <span className="font-bold">{Number(doc.montant).toFixed(2)} MAD</span>
                                                <Button variant="link" size="sm" asChild>
                                                    <Link href={doc.doc_type === "Commande" ? `/bon-commandes/${doc.id}` : `/bon-achats/${doc.id}`}>Détails</Link>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {historiqueGlobal.length === 0 && <p className="text-center text-muted-foreground">Aucun historique disponible.</p>}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </>
            ) : (
                <div className="text-center py-24 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>Veuillez sélectionner un fournisseur pour afficher son état.</p>
                </div>
            )}
        </div>
    )
}
