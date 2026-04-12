"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useTresoreries, useDeleteTresorerie } from "@/hooks/use-tresoreries"
import { DataTable } from "@/components/data-table/data-table"
import type { Tresorerie } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

export default function TresoreriesPage() {
    const { data: tresoreries, isLoading } = useTresoreries()
    const deleteTresorerie = useDeleteTresorerie()

    const handleDelete = async (id: string) => {
        try {
            await deleteTresorerie.mutateAsync(id)
            toast.success("Trésorerie supprimée avec succès")
        } catch {
            toast.error("Erreur lors de la suppression de la trésorerie")
        }
    }

    const columns: ColumnDef<Tresorerie>[] = [
        { accessorKey: "code", header: "Code" },
        { accessorKey: "libelle", header: "Libellé" },
        {
            accessorKey: "type",
            header: "Type",
            cell: ({ row }) => (
                <Badge variant={row.original.type === "banque" ? "default" : "secondary"}>
                    {row.original.type === "banque" ? "Banque" : "Caisse"}
                </Badge>
            ),
        },
        {
            accessorKey: "solde",
            header: "Solde",
            cell: ({ row }) => `${Number(row.original.solde).toFixed(2)} DH`,
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const tresorerie = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/tresoreries/${tresorerie.id}`}><Eye className="mr-2 h-4 w-4" />Voir</Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href={`/tresoreries/${tresorerie.id}/modifier`}><Pencil className="mr-2 h-4 w-4" />Modifier</Link></DropdownMenuItem>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                        <AlertDialogDescription>Voulez-vous vraiment supprimer la trésorerie &quot;{tresorerie.libelle}&quot; ? Cette action est irréversible.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(tresorerie.id)}>Supprimer</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Trésoreries</h2>
                <p className="text-muted-foreground">Gérez vos caisses et comptes bancaires</p>
            </div>
            <DataTable columns={columns} data={tresoreries || []} searchPlaceholder="Rechercher une trésorerie..." createUrl="/tresoreries/nouveau" createLabel="Nouvelle trésorerie" />
        </div>
    )
}
