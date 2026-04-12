"use client"

import { useState } from "react"
import { useStockList } from "@/hooks/use-stock"
import { useDepots } from "@/hooks/use-depots"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Package, AlertTriangle, TrendingDown } from "lucide-react"

export default function StockPage() {
    const { data: stock, isLoading } = useStockList()
    const { data: depots } = useDepots()
    const [depotFilter, setDepotFilter] = useState<string>("all")
    const [search, setSearch] = useState("")

    const filtered = stock?.filter((s) => {
        if (depotFilter !== "all" && s.depot_id !== depotFilter) return false
        if (search && !s.article?.designation.toLowerCase().includes(search.toLowerCase()) && !s.article?.code.toLowerCase().includes(search.toLowerCase())) return false
        return true
    }) || []

    const totalArticles = filtered.length
    const alerteStock = filtered.filter((s) => s.article && s.quantite <= s.article.seuil_alerte).length
    const rupture = filtered.filter((s) => s.quantite <= 0).length

    if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>

    return (
        <div className="space-y-6">
            <div><h2 className="text-3xl font-bold tracking-tight">Stock</h2><p className="text-muted-foreground">État des stocks par article et dépôt</p></div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total articles</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalArticles}</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Alerte stock</CardTitle><AlertTriangle className="h-4 w-4 text-orange-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-orange-500">{alerteStock}</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Rupture de stock</CardTitle><TrendingDown className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{rupture}</div></CardContent></Card>
            </div>

            <div className="flex gap-4">
                <Input placeholder="Rechercher un article..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
                <Select value={depotFilter} onValueChange={setDepotFilter}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tous les dépôts" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les dépôts</SelectItem>
                        {depots?.map((d) => (<SelectItem key={d.id} value={d.id}>{d.libelle}</SelectItem>))}
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead><TableHead>Désignation</TableHead><TableHead>Famille</TableHead>
                                    <TableHead>Dépôt</TableHead><TableHead className="text-right">Quantité</TableHead>
                                    <TableHead className="text-right">Seuil</TableHead><TableHead>État</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((s) => {
                                    const isAlert = s.article && s.quantite <= s.article.seuil_alerte
                                    const isRupture = s.quantite <= 0
                                    return (
                                        <TableRow key={s.id} className={isRupture ? "bg-destructive/5" : isAlert ? "bg-orange-50 dark:bg-orange-950/10" : ""}>
                                            <TableCell className="font-mono text-sm">{s.article?.code}</TableCell>
                                            <TableCell className="font-medium">{s.article?.designation}</TableCell>
                                            <TableCell className="text-muted-foreground">{s.article?.famille?.libelle || "—"}</TableCell>
                                            <TableCell>{s.depot?.libelle}</TableCell>
                                            <TableCell className="text-right font-bold">{s.quantite}</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{s.article?.seuil_alerte}</TableCell>
                                            <TableCell>
                                                {isRupture ? <Badge variant="destructive">Rupture</Badge> : isAlert ? <Badge variant="outline" className="border-orange-500 text-orange-600">Alerte</Badge> : <Badge variant="secondary">OK</Badge>}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                                {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucun stock trouvé</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

