"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useBonCommandeList, useDeleteBonCommande, useUpdateBonCommandeStatut, useToggleBonCommandeTVA } from "@/hooks/use-bon-commandes"
import { DataTable } from "@/components/data-table/data-table"
import type { BonCommande } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Pencil, Trash2, Eye, CheckCircle, Send, FileText } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import Link from "next/link"
import { toast } from "sonner"
import { LoadingScreen } from "@/components/ui/loading-screen"

const statutColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = { brouillon: "secondary", envoye: "outline", recu: "default", annule: "destructive" }
const statutLabels: Record<string, string> = { brouillon: "Brouillon", envoye: "Envoyé", recu: "Reçu", annule: "Annulé" }

export default function BonCommandesPage() {
    const { data: bcs, isLoading } = useBonCommandeList()
    const deleteBC = useDeleteBonCommande()
    const updateStatut = useUpdateBonCommandeStatut()
    const toggleTVA = useToggleBonCommandeTVA()

    const handleDelete = async (id: string) => { try { await deleteBC.mutateAsync(id); toast.success("Bon de commande supprimé") } catch { toast.error("Erreur lors de la suppression") } }
    const handleToggleTVA = async (id: string, currentInclureTva: boolean) => {
        try {
            await toggleTVA.mutateAsync({ id, inclure_tva: !currentInclureTva })
            toast.success(`TVA ${!currentInclureTva ? "activée" : "désactivée"} con éxito`)
        } catch (error: any) {
            toast.error(error.message || "Erreur lors du changement de TVA")
        }
    }

    const columns: ColumnDef<BonCommande>[] = [
        { accessorKey: "numero", header: "N° BC" },
        { accessorKey: "date", header: "Date", cell: ({ row }) => new Date(row.original.date).toLocaleDateString("fr-FR") },
        { accessorKey: "fournisseur", header: "Fournisseur", cell: ({ row }) => row.original.fournisseur?.raison_sociale || "—" },
        { accessorKey: "montant_ttc", header: "Montant TTC", cell: ({ row }) => `${Number(row.original.montant_ttc).toFixed(2)} MAD` },
        {
            id: "type",
            header: "Tipo",
            cell: ({ row }) => (
                <div className="flex justify-center">
                    {row.original.inclure_tva ? "✅" : "➖"}
                </div>
            ),
        },
        { accessorKey: "statut", header: "Statut", cell: ({ row }) => <Badge variant={statutColors[row.original.statut] || "secondary"}>{statutLabels[row.original.statut] || row.original.statut}</Badge> },
        {
            id: "actions",
            enableSorting: false,
            cell: ({ row }) => {
                const bc = row.original
                return (
                    <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild><Link href={`/bon-commandes/${bc.id}`}><Eye className="mr-2 h-4 w-4" />Voir</Link></DropdownMenuItem>
                                <DropdownMenuItem asChild><Link href={`/bon-commandes/${bc.id}/modifier`}><Pencil className="mr-2 h-4 w-4" />Modifier</Link></DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleTVA(bc.id, !!bc.inclure_tva)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    {bc.inclure_tva ? "Retirer TVA" : "Appliquer TVA"}
                                </DropdownMenuItem>
                                {bc.statut === "brouillon" && (<><DropdownMenuSeparator /><DropdownMenuItem onClick={() => updateStatut.mutateAsync({ id: bc.id, statut: "envoye" }).then(() => toast.success("BC envoyé")).catch(() => toast.error("Erreur"))}><Send className="mr-2 h-4 w-4" />Envoyer</DropdownMenuItem></>)}
                                {bc.statut === "envoye" && (<><DropdownMenuSeparator /><DropdownMenuItem onClick={() => updateStatut.mutateAsync({ id: bc.id, statut: "recu" }).then(() => toast.success("BC marqué reçu")).catch(() => toast.error("Erreur"))}><CheckCircle className="mr-2 h-4 w-4 text-green-600" />Marquer reçu</DropdownMenuItem></>)}
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem></AlertDialogTrigger>
                                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmer la suppression</AlertDialogTitle><AlertDialogDescription>Voulez-vous vraiment supprimer le BC {bc.numero} ?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(bc.id)}>Supprimer</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
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
            <div><h2 className="text-3xl font-bold tracking-tight">Bons de commande</h2><p className="text-muted-foreground">Gérez vos commandes fournisseurs</p></div>
            <DataTable 
                columns={columns} 
                data={bcs || []} 
                searchPlaceholder="Rechercher un bon de commande..." 
                createUrl="/bon-commandes/nouveau" 
                createLabel="Nouveau BC"
                getRowHref={(row) => `/bon-commandes/${row.id}`}
            />
        </div>
    )
}
