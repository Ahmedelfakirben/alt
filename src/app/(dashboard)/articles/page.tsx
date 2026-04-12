"use client"

import { ColumnDef } from "@tanstack/react-table"
import { useArticles, useDeleteArticle } from "@/hooks/use-articles"
import { DataTable } from "@/components/data-table/data-table"
import type { Article } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"

export default function ArticlesPage() {
    const { data: articles, isLoading } = useArticles()
    const deleteArticle = useDeleteArticle()

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
        { accessorKey: "code_barre", header: "Code Barre" },
        { accessorKey: "designation", header: "Désignation" },
        {
            accessorKey: "famille",
            header: "Famille",
            cell: ({ row }) => (row.original as any).famille?.libelle || "—",
        },
        {
            accessorKey: "prix_achat",
            header: "Prix achat",
            cell: ({ row }) => `${Number(row.original.prix_achat).toFixed(2)} DH`,
        },
        {
            accessorKey: "stock_actuel",
            header: "Stock",
            cell: ({ row }) => {
                const stock = (row.original as any).stock_actuel ?? 0
                return (
                    <div className={`font-bold ${stock <= 0 ? "text-destructive" : stock <= (row.original.seuil_alerte || 0) ? "text-orange-500" : ""}`}>
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
            accessorKey: "actif",
            header: "Statut",
            cell: ({ row }) => (
                <Badge variant={row.original.actif ? "default" : "secondary"}>
                    {row.original.actif ? "Actif" : "Inactif"}
                </Badge>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const article = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
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
                )
            },
        },
    ]

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Articles</h2>
                <p className="text-muted-foreground">Gérez vos articles et produits</p>
            </div>
            <DataTable
                columns={columns}
                data={articles || []}
                searchPlaceholder="Rechercher un article..."
                createUrl="/articles/nouveau"
                createLabel="Nouvel article"
            />
        </div>
    )
}
