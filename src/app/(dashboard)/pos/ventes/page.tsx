"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useVentePosList, useDeleteVentePos } from "@/hooks/use-ventes-pos"
import { DataTable } from "@/components/data-table/data-table"
import type { VentePos } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Trash2, Eye } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import Link from "next/link"
import { toast } from "sonner"
import { LoadingScreen } from "@/components/ui/loading-screen"

const modeLabels: Record<string, string> = { especes: "Espèces", carte: "Carte", cheque: "Chèque", virement: "Virement" }

export default function VentesPosPage() {
    const { data: ventes, isLoading } = useVentePosList()
    const deleteVente = useDeleteVentePos()
    const handleDelete = async (id: string) => { try { await deleteVente.mutateAsync(id); toast.success("Vente supprimée") } catch { toast.error("Erreur lors de la suppression") } }

    const columns: ColumnDef<VentePos>[] = [
        { accessorKey: "numero", header: "N° Vente" },
        { accessorKey: "date", header: "Date", cell: ({ row }) => new Date(row.original.date).toLocaleDateString("fr-FR") },
        { accessorKey: "client", header: "Client", cell: ({ row }) => row.original.client?.raison_sociale || "Comptoir" },
        { accessorKey: "mode_paiement", header: "Paiement", cell: ({ row }) => <Badge variant="outline">{modeLabels[row.original.mode_paiement] || row.original.mode_paiement}</Badge> },
        { accessorKey: "montant_ttc", header: "Montant TTC", cell: ({ row }) => `${Number(row.original.montant_ttc).toFixed(2)} MAD` },
        {
            id: "actions",
            enableSorting: false,
            cell: ({ row }) => {
                const v = row.original
                return (
                    <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild><Link href={`/pos/ventes/${v.id}`}><Eye className="mr-2 h-4 w-4" />Voir</Link></DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem></AlertDialogTrigger>
                                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmer la suppression</AlertDialogTitle><AlertDialogDescription>Supprimer la vente {v.numero} ?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(v.id)}>Supprimer</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ]

    if (isLoading) return <LoadingScreen />
    return (
        <div className="space-y-6">
            <div><h2 className="text-3xl font-bold tracking-tight">Ventes POS</h2><p className="text-muted-foreground">Historique des ventes au comptoir</p></div>
            <DataTable 
                columns={columns} 
                data={ventes || []} 
                searchPlaceholder="Rechercher une vente..." 
                createUrl="/pos/nouveau" 
                createLabel="Nouvelle vente"
                getRowHref={(row) => `/pos/ventes/${row.id}`}
            />
        </div>
    )
}
