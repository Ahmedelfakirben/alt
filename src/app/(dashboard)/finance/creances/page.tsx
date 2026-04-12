"use client"

import { useState } from "react"
import { useClients } from "@/hooks/use-clients"
import { useDevisByClient } from "@/hooks/use-devis"
import { useBonLivraisonsByClient } from "@/hooks/use-bon-livraisons"
import { DataTable } from "@/components/data-table/data-table"
import { ColumnDef } from "@tanstack/react-table"
import type { Devis, BonLivraison } from "@/types/database"
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

export default function EtatClientPage() {
    const { data: clients, isLoading: loadingClients } = useClients()
    const [selectedClientId, setSelectedClientId] = useState<string>("")

    const { data: devis, isLoading: loadingDevis } = useDevisByClient(selectedClientId)
    const { data: factures, isLoading: loadingFactures } = useBonLivraisonsByClient(selectedClientId)

    const devisColumns: ColumnDef<Devis>[] = [
        { accessorKey: "date", header: "Date", cell: ({ row }) => new Date(row.original.date).toLocaleDateString("fr-FR") },
        { accessorKey: "numero", header: "N° Devis" },
        { accessorKey: "montant_ttc", header: "Total TTC", cell: ({ row }) => <span className="font-medium">{Number(row.original.montant_ttc).toFixed(2)}</span> },
        { accessorKey: "statut", header: "Statut", cell: ({ row }) => <Badge variant={statusColors[row.original.statut] || "outline"}>{row.original.statut}</Badge> },
        {
            id: "actions",
            cell: ({ row }) => (
                <Button asChild variant="ghost" size="sm">
                    <Link href={`/devis/${row.original.id}`}><Eye className="h-4 w-4 mr-2" />Voir</Link>
                </Button>
            ),
        },
    ]

    const facturesColumns: ColumnDef<BonLivraison>[] = [
        { accessorKey: "date", header: "Date", cell: ({ row }) => new Date(row.original.date).toLocaleDateString("fr-FR") },
        { accessorKey: "numero", header: "N° Facture/BL" },
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
                    <Link href={`/bon-livraisons/${row.original.id}`}><Eye className="h-4 w-4" /></Link>
                </Button>
            ),
        },
    ]

    if (loadingClients) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /></div>

    const facturesPayees = factures?.filter(f => f.statut_paiement === "paye" || f.statut_paiement === "partiel" && Number(f.montant_regle) > 0) || []
    const impayes = factures?.filter(f => !f.statut_paiement || f.statut_paiement === "impaye" || (f.statut_paiement === "partiel" && Number(f.montant_ttc) > Number(f.montant_regle || 0))) || []

    const historiqueGlobal = [
        ...(devis || []).map(d => ({ ...d, doc_type: "Devis", num: d.numero, montant: d.montant_ttc, date_val: new Date(d.date) })),
        ...(factures || []).map(f => ({ ...f, doc_type: "Facture/BL", num: f.numero, montant: f.montant_ttc, date_val: new Date(f.date) }))
    ].sort((a, b) => b.date_val.getTime() - a.date_val.getTime())

    const totalImpaye = impayes.reduce((acc, curr) => acc + (Number(curr.montant_ttc) - Number(curr.montant_regle || 0)), 0)
    const clientActuel = clients?.find(c => c.id === selectedClientId)

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">État du Client</h2>
                    <p className="text-muted-foreground">Gestion complète du dossier client</p>
                </div>
                <div className="w-full md:w-[300px]">
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un client..." />
                        </SelectTrigger>
                        <SelectContent>
                            {clients?.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.code} - {c.raison_sociale}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {selectedClientId ? (
                <>
                    <div className="grid gap-4 md:grid-cols-3 mb-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Informations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{clientActuel?.raison_sociale}</div>
                                <p className="text-xs text-muted-foreground mt-1">Code: {clientActuel?.code}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Chiffre d'Affaires</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {(factures?.reduce((acc, f) => acc + Number(f.montant_ttc), 0) || 0).toFixed(2)} MAD
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Total facturé</p>
                            </CardContent>
                        </Card>
                        <Card className="border-destructive">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-destructive">Créances (Impayés)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-destructive">{totalImpaye.toFixed(2)} MAD</div>
                                <p className="text-xs text-muted-foreground mt-1">Total restant dû</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="impayes" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="impayes">Impayés</TabsTrigger>
                            <TabsTrigger value="factures">Factures</TabsTrigger>
                            <TabsTrigger value="devis">Devis</TabsTrigger>
                            <TabsTrigger value="historique">Historique</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="impayes" className="mt-6">
                            <Card>
                                <CardHeader><CardTitle>Factures Impayées</CardTitle></CardHeader>
                                <CardContent>
                                    <DataTable columns={facturesColumns} data={impayes} searchPlaceholder="Chercher..." />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="factures" className="mt-6">
                            <Card>
                                <CardHeader><CardTitle>Factures / B.L. Payés</CardTitle></CardHeader>
                                <CardContent>
                                    <DataTable columns={facturesColumns} data={facturesPayees} searchPlaceholder="Chercher..." />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="devis" className="mt-6">
                            <Card>
                                <CardHeader><CardTitle>Devis du client</CardTitle></CardHeader>
                                <CardContent>
                                    <DataTable columns={devisColumns} data={devis || []} searchPlaceholder="Chercher..." />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="historique" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Historique Récent</CardTitle>
                                    <CardDescription>Tous les documents générés depuis la création du compte.</CardDescription>
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
                                                    <Link href={doc.doc_type === "Devis" ? `/devis/${doc.id}` : `/bon-livraisons/${doc.id}`}>Détails</Link>
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
                    <p>Veuillez sélectionner un client pour afficher son état.</p>
                </div>
            )}
        </div>
    )
}
