"use client"

import { useParams } from "next/navigation"
import { useArticle } from "@/hooks/use-articles"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Pencil } from "lucide-react"
import Link from "next/link"
import { useHistoriqueArticle } from "@/hooks/use-mouvements-stock"
import { DataTable } from "@/components/data-table/data-table"
import { ColumnDef } from "@tanstack/react-table"
import type { MouvementStock } from "@/types/database"

export default function ArticleDetailPage() {
    const params = useParams()
    const id = params.id as string
    const { data: article, isLoading } = useArticle(id)
    const { data: historique, isLoading: isHistoryLoading } = useHistoriqueArticle(id)

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (!article) return <p>Article introuvable</p>

    const getSourceLink = (type: string, id: string) => {
        switch (type) {
            case "bon_livraison": return `/bon-livraisons/${id}`
            case "bon_achat": return `/bon-achats/${id}`
            case "bon_retour": return `/bon-retours/${id}`
            case "bon_retour_achat": return `/bon-retour-achats/${id}`
            case "vente_pos": return `/pos/ventes/${id}`
            case "devis": return `/devis/${id}`
            default: return null
        }
    }

    const historyColumns: ColumnDef<MouvementStock>[] = [
        {
            accessorKey: "created_at",
            header: "Date",
            cell: ({ row }) => new Date(row.original.created_at).toLocaleString("fr-FR"),
        },
        {
            accessorKey: "type",
            header: "Type",
            cell: ({ row }) => (
                <Badge variant={row.original.type === "entree" ? "default" : "destructive"}>
                    {row.original.type === "entree" ? "Entrée" : "Sortie"}
                </Badge>
            ),
        },
        {
            accessorKey: "quantite",
            header: "Quantité",
            cell: ({ row }) => <span className="font-bold">{row.original.quantite} {article.unite}</span>,
        },
        {
            accessorKey: "reference_type",
            header: "Source",
            cell: ({ row }) => {
                const link = getSourceLink(row.original.reference_type, row.original.reference_id)
                const label = row.original.reference_type.replace(/_/g, " ")
                if (link) {
                    return (
                        <Link href={link} className="text-orange-600 hover:underline font-bold capitalize">
                            {label}
                        </Link>
                    )
                }
                return <span className="capitalize">{label}</span>
            },
        },
        {
            accessorKey: "depot.libelle",
            header: "Dépôt",
            cell: ({ row }) => (row.original.depot as any)?.libelle || "—",
        },
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{article.designation}</h2>
                    <p className="text-muted-foreground">Code : {article.code} {article.reference && `| Réf : ${article.reference}`}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={article.actif ? "default" : "secondary"}>
                        {article.actif ? "Actif" : "Inactif"}
                    </Badge>
                    <Button asChild>
                        <Link href={`/articles/${article.id}/modifier`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifier
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Informations générales</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <span className="text-sm text-muted-foreground">Famille</span>
                            <p>{article.famille?.libelle || "—"}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Code Barre</span>
                            <p>{article.code_barre || "—"}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Unité</span>
                            <p>{article.unite}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Tarification</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <span className="text-sm text-muted-foreground">Prix d&apos;achat</span>
                            <p className="text-lg font-semibold">{Number(article.prix_achat).toFixed(2)} DH</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Prix de vente</span>
                            <p className="text-lg font-semibold">{Number(article.prix_vente).toFixed(2)} DH</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">TVA</span>
                            <p>{article.tva}%</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <span className="text-sm text-muted-foreground">Seuil d&apos;alerte (Stock)</span>
                            <p>{article.seuil_alerte}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Date de création</span>
                            <p>{new Date(article.created_at).toLocaleDateString("fr-FR")}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">Historique de l&apos;article</h3>
                <Card>
                    <CardContent className="p-0">
                        {isHistoryLoading ? (
                            <div className="p-4"><Skeleton className="h-32 w-full" /></div>
                        ) : (
                            <DataTable 
                                columns={historyColumns} 
                                data={historique || []} 
                                searchPlaceholder="Filtrer l'historique..."
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
