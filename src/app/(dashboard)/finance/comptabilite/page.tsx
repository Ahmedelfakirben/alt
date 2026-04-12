"use client"

import { useBalanceGenerale, useGrandLivre } from "@/hooks/use-comptabilite"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/data-table/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useMemo } from "react"
import { ArrowUpRight, ArrowDownLeft, Eye } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export default function ComptabilitePage() {
    const { data: balance, isLoading: loadingBalance } = useBalanceGenerale()
    const { data: grandLivre, isLoading: loadingGL } = useGrandLivre()

    // State for navigation
    const [activeTab, setActiveTab] = useState("balance")
    const [glFilter, setGlFilter] = useState("")

    const handleAccountClick = (compte: string) => {
        setGlFilter(compte)
        setActiveTab("grandlivre")
    }

    const stats = useMemo(() => {
        if (!balance) return { actif: 0, passif: 0, charges: 0, produits: 0 }
        return balance.reduce((acc: any, row: any) => {
            const classe = row.classe
            const solde = Number(row.solde)

            if ([1, 4, 5].includes(classe) && solde < 0) acc.passif += Math.abs(solde)
            else if ([2, 3, 5].includes(classe) && solde > 0) acc.actif += solde
            else if (classe === 6) acc.charges += solde
            else if (classe === 7) acc.produits += Math.abs(solde)

            return acc
        }, { actif: 0, passif: 0, charges: 0, produits: 0 })
    }, [balance])

    const balanceColumns: ColumnDef<any>[] = [
        {
            accessorKey: "compte",
            header: "Compte",
            cell: ({ row }) => (
                <Button
                    variant="link"
                    className="p-0 h-auto font-mono text-blue-600 hover:underline"
                    onClick={() => handleAccountClick(row.original.compte)}
                >
                    {row.original.compte}
                </Button>
            )
        },
        { accessorKey: "libelle", header: "Libellé" },
        {
            accessorKey: "total_debit",
            header: "Total Débit",
            cell: ({ row }) => <span className="text-muted-foreground">{Number(row.original.total_debit).toFixed(2)}</span>
        },
        {
            accessorKey: "total_credit",
            header: "Total Crédit",
            cell: ({ row }) => <span className="text-muted-foreground">{Number(row.original.total_credit).toFixed(2)}</span>
        },
        {
            accessorKey: "solde",
            header: "Solde",
            cell: ({ row }) => {
                const solde = Number(row.original.solde)
                return (
                    <span className={solde >= 0 ? "font-bold text-blue-600" : "font-bold text-amber-600"}>
                        {solde >= 0 ? "D " : "C "} {Math.abs(solde).toFixed(2)} DH
                    </span>
                )
            }
        },
    ]

    const glColumns: ColumnDef<any>[] = [
        {
            accessorKey: "date",
            header: "Date",
            cell: ({ row }) => new Date(row.original.date).toLocaleDateString("fr-FR")
        },
        { accessorKey: "journal_code", header: "Jnl" },
        { accessorKey: "compte", header: "Compte" },
        {
            accessorKey: "ecriture_libelle",
            header: "Libellé Écriture",
            cell: ({ row }) => {
                const type = row.original.reference_type
                const id = row.original.reference_id
                let link = null

                if (type === 'bon_livraison') link = `/bon-livraisons/${id}`
                else if (type === 'bon_achat') link = `/bon-achats/${id}`
                else if (type === 'bon_retour') link = `/bon-retours/${id}`
                else if (type === 'paiement') link = null // No direct payment page yet usually

                // If we have a link, wrap content
                const content = (
                    <div className="flex flex-col">
                        <span className="font-medium">{row.original.ecriture_libelle}</span>
                        <span className="text-xs text-muted-foreground">{row.original.ligne_libelle}</span>
                    </div>
                )

                if (link) {
                    return (
                        <Link href={link} className="hover:underline text-blue-600 flex items-center gap-1 group">
                            {content}
                            <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                    )
                }
                return content
            }
        },
        {
            accessorKey: "debit",
            header: "Débit",
            cell: ({ row }) => row.original.debit > 0 ? <span className="font-medium text-slate-700">{Number(row.original.debit).toFixed(2)}</span> : "-"
        },
        {
            accessorKey: "credit",
            header: "Crédit",
            cell: ({ row }) => row.original.credit > 0 ? <span className="font-medium text-slate-700">{Number(row.original.credit).toFixed(2)}</span> : "-"
        },
        {
            id: "actions",
            header: "Doc.",
            cell: ({ row }) => {
                const type = row.original.reference_type
                const id = row.original.reference_id

                // For payments, check the underlying doc
                const payType = row.original.pay_doc_type
                const payId = row.original.pay_doc_id

                let link = null
                let label = ""

                // Direct Document
                if (type === 'bon_livraison') { link = `/bon-livraisons/${id}`; label = "BL"; }
                else if (type === 'bon_achat') { link = `/bon-achats/${id}`; label = "BA"; }
                else if (type === 'bon_retour') { link = `/bon-retours/${id}`; label = "BR"; }

                // Payment Document
                else if (type === 'paiement' && payType) {
                    if (payType === 'bon_livraison') { link = `/bon-livraisons/${payId}`; label = "BL (Ref)"; }
                    else if (payType === 'bon_achat') { link = `/bon-achats/${payId}`; label = "BA (Ref)"; }
                    else if (payType === 'bon_retour') { link = `/bon-retours/${payId}`; label = "BR (Ref)"; }
                }

                if (link) {
                    return (
                        <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-blue-600">
                            <Link href={link}>
                                <Eye className="h-4 w-4 mr-1" />
                                {label}
                            </Link>
                        </Button>
                    )
                }
                return <span className="text-muted-foreground text-xs">-</span>
            }
        },
    ]

    if (loadingBalance || loadingGL) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Comptabilité</h2>
                <p className="text-muted-foreground">Vue d&apos;ensemble et documents comptables (PCGM)</p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Charges (Classe 6)</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-red-600">{stats.charges.toFixed(2)} DH</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Produits (Classe 7)</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{stats.produits.toFixed(2)} DH</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Créances (Actif Circ.)</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.actif.toFixed(2)} DH</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Dettes (Passif Circ.)</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.passif.toFixed(2)} DH</div></CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="balance">Balance Générale</TabsTrigger>
                    <TabsTrigger value="grandlivre">Grand Livre</TabsTrigger>
                </TabsList>
                <TabsContent value="balance" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Balance des Comptes</CardTitle></CardHeader>
                        <CardContent>
                            <DataTable columns={balanceColumns} data={balance || []} searchPlaceholder="Rechercher un compte..." />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="grandlivre" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Détail des Écritures</CardTitle></CardHeader>
                        <CardContent>
                            <DataTable
                                columns={glColumns}
                                data={grandLivre || []}
                                searchPlaceholder="Rechercher une écriture..."
                                globalFilter={glFilter}
                                onGlobalFilterChange={setGlFilter}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
