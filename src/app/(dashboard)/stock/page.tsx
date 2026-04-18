"use client"

import { useState, useMemo } from "react"
import { useStockList } from "@/hooks/use-stock"
import { useDepots } from "@/hooks/use-depots"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Package, AlertTriangle, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRouter } from "next/navigation"

export default function StockPage() {
    const router = useRouter()
    const { data: stock, isLoading } = useStockList()
    const { data: depots } = useDepots()
    const [depotFilter, setDepotFilter] = useState<string>("all")
    const [search, setSearch] = useState("")
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: '', direction: null })

    const filtered = useMemo(() => {
        return stock?.filter((s) => {
            if (depotFilter !== "all" && s.depot_id !== depotFilter) return false
            if (search && !s.article?.designation.toLowerCase().includes(search.toLowerCase()) && !s.article?.code.toLowerCase().includes(search.toLowerCase())) return false
            return true
        }) || []
    }, [stock, depotFilter, search])

    const totalArticles = filtered.length
    const alerteStock = filtered.filter((s) => s.article && s.quantite <= s.article.seuil_alerte).length
    const rupture = filtered.filter((s) => s.quantite <= 0).length

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' | null = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = null
        }
        setSortConfig({ key, direction })
    }

    const sortedData = useMemo(() => {
        let items = [...filtered]
        if (sortConfig.direction !== null) {
            items.sort((a, b) => {
                let aValue: any = ""
                let bValue: any = ""

                switch (sortConfig.key) {
                    case 'code': aValue = a.article?.code || ""; bValue = b.article?.code || ""; break;
                    case 'designation': aValue = a.article?.designation || ""; bValue = b.article?.designation || ""; break;
                    case 'famille': aValue = a.article?.famille?.libelle || ""; bValue = b.article?.famille?.libelle || ""; break;
                    case 'depot': aValue = a.depot?.libelle || ""; bValue = b.depot?.libelle || ""; break;
                    case 'quantite': aValue = a.quantite; bValue = b.quantite; break;
                    case 'seuil': aValue = a.article?.seuil_alerte || 0; bValue = b.article?.seuil_alerte || 0; break;
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
                return 0
            })
        }
        return items
    }, [filtered, sortConfig])

    const handleRowClick = (id: string | undefined) => { if (id) router.push(`/articles/${id}`) }
    const handleRowAuxClick = (e: React.MouseEvent, id: string | undefined) => { if (e.button === 1 && id) { e.preventDefault(); window.open(`/articles/${id}`, "_blank") } }

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />
        if (sortConfig.direction === 'asc') return <ArrowUp className="ml-2 h-4 w-4" />
        if (sortConfig.direction === 'desc') return <ArrowDown className="ml-2 h-4 w-4" />
        return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />
    }

    if (isLoading) return <LoadingScreen />

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
                                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('code')}><div className="flex items-center">Code<SortIcon column="code" /></div></TableHead>
                                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('designation')}><div className="flex items-center">Désignation<SortIcon column="designation" /></div></TableHead>
                                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('famille')}><div className="flex items-center">Famille<SortIcon column="famille" /></div></TableHead>
                                    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('depot')}><div className="flex items-center">Dépôt<SortIcon column="depot" /></div></TableHead>
                                    <TableHead className="cursor-pointer select-none hover:bg-muted/50 text-right" onClick={() => handleSort('quantite')}><div className="flex items-center justify-end">Quantité<SortIcon column="quantite" /></div></TableHead>
                                    <TableHead className="cursor-pointer select-none hover:bg-muted/50 text-right" onClick={() => handleSort('seuil')}><div className="flex items-center justify-end">Seuil<SortIcon column="seuil" /></div></TableHead>
                                    <TableHead>État</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedData.map((s) => {
                                    const isAlert = s.article && s.quantite <= s.article.seuil_alerte
                                    const isRupture = s.quantite <= 0
                                    return (
                                        <TableRow 
                                            key={s.id} 
                                            className={`cursor-pointer transition-colors ${isRupture ? "bg-destructive/5 hover:bg-destructive/10" : isAlert ? "bg-orange-50 dark:bg-orange-950/10 hover:bg-orange-100 dark:hover:bg-orange-900/20" : "hover:bg-muted/50"}`}
                                            onClick={() => handleRowClick(s.article_id)}
                                            onAuxClick={(e) => handleRowAuxClick(e, s.article_id)}
                                        >
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
                                {sortedData.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucun stock trouvé</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

