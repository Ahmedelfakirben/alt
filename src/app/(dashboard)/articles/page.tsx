"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useArticles, useDeleteArticle } from "@/hooks/use-articles"
import { DataTable } from "@/components/data-table/data-table"
import type { Article } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Pencil, Trash2, Eye, Package } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { toast } from "sonner"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { useFiscalMode } from "@/providers/fiscal-mode-context"

export default function ArticlesPage() {
    const { data: articles, isLoading } = useArticles()
    const deleteArticle = useDeleteArticle()
    const { fiscalMode } = useFiscalMode()

    const handleDelete = async (id: string) => {
        try {
            await deleteArticle.mutateAsync(id)
            toast.success("Article supprimé avec succès")
        } catch {
            toast.error("Erreur lors de la suppression de l'article")
        }
    }

    const columns: ColumnDef<Article>[] = [
        { accessorKey: "code", header: "Code" },
        { accessorKey: "reference", header: "Réf." },
        { accessorKey: "designation", header: "Désignation" },
        {
            accessorFn: (row) => (row as any).famille?.libelle,
            id: "famille",
            header: "Famille",
            cell: ({ row }) => (row.original as any).famille?.libelle || "—",
        },
        {
            accessorFn: (row) => (row as any).sous_famille?.libelle,
            id: "sous_famille",
            header: "Sous-Famille",
            cell: ({ row }) => (row.original as any).sous_famille?.libelle || "—",
        },
        {
            accessorKey: "prix_achat",
            header: "Prix achat",
            cell: ({ row }) => `${Number(row.original.prix_achat).toFixed(2)} DH`,
        },
        {
            accessorKey: "stock_actuel",
            header: fiscalMode ? "Stock [F]" : "Stock",
            cell: ({ row }) => {
                // Determine which stock to show based on fiscal mode
                const stock = fiscalMode 
                    ? (row.original as any).quantite_fiscale ?? 0 
                    : (row.original as any).stock_actuel ?? 0
                
                return (
                    <div className={`font-bold flex items-center gap-1.5 ${stock <= 0 ? "text-destructive" : stock <= (row.original.seuil_alerte || 0) ? "text-orange-500" : ""}`}>
                        {fiscalMode && <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-amber-500/50 text-amber-600 bg-amber-500/5">F</Badge>}
                        {stock}
                    </div>
                )
            },
        },
        {
            accessorKey: "prix_vente",
            header: "Prix vente",
            cell: ({ row }) => `${Number(row.original.prix_vente).toFixed(2)} DH`,
        },
        {
            accessorKey: "tva",
            header: "TVA",
            cell: ({ row }) => `${row.original.tva}%`,
        },
        {
            accessorFn: (row) => row.actif ? "Actif" : "Inactif",
            id: "actif",
            header: "Statut",
            cell: ({ row }) => (
                <Badge variant={row.original.actif ? "default" : "secondary"}>
                    {row.original.actif ? "Actif" : "Inactif"}
                </Badge>
            ),
        },
        {
            id: "actions",
            enableSorting: false,
            cell: ({ row }) => {
                const article = row.original
                return (
                    <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    < MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={`/articles/${article.id}`}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Voir
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={`/articles/${article.id}/modifier`}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Modifier
                                    </Link>
                                </DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Supprimer
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Voulez-vous vraiment supprimer l&apos;article &quot;{article.designation}&quot; ?
                                                Cette action est irréversible.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(article.id)}>
                                                Supprimer
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
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
            <div className="flex justify-between items-center">
                <div>
                    <h2 className={`text-3xl font-bold tracking-tight ${fiscalMode ? "text-amber-500" : ""}`}>
                        {fiscalMode ? "Catalogue Facturé" : "Articles"}
                    </h2>
                    <p className="text-muted-foreground">
                        {fiscalMode ? "Vues des stocks et tarifs facturés avec TVA" : "Gérez vos articles et produits globaux"}
                    </p>
                </div>
                {fiscalMode && (
                    <Badge variant="outline" className="bg-amber-500/10 border-amber-500/50 text-amber-600 px-3 py-1 animate-pulse">
                        Mode Fiscal Actif
                    </Badge>
                )}
            </div>
            <DataTable
                columns={columns}
                data={articles || []}
                searchPlaceholder="Rechercher un article..."
                createUrl="/articles/nouveau"
                createLabel="Nouvel article"
                getRowHref={(row) => `/articles/${row.id}`}
            />
        </div>
    )
}
