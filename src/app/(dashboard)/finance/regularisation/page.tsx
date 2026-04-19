"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
    AlertTriangle, 
    CheckCircle2, 
    ArrowDownCircle, 
    ArrowUpCircle, 
    Scale, 
    AlertCircle, 
    Package, 
    FileText,
    History,
    ShoppingCart,
    Search
} from "lucide-react"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { MouvementHistoryDialog } from "@/components/finance/mouvement-history-dialog"
import { useState } from "react"
import { Input } from "@/components/ui/input"

export default function RegularisationPage() {
    const supabase = createClient()
    const [selectedItem, setSelectedItem] = useState<{ articleId: string, depotId: string, designation: string } | null>(null)
    const [searchTerm, setSearchTerm] = useState("")

    // Fetch Fiscal Balance View
    const { data: fiscalBalance, isLoading: isLoadingFiscal } = useQuery({
        queryKey: ["fiscal-balance"],
        queryFn: async () => {
            const { data, error } = await supabase.from("v_fiscal_balance").select("*").order("article_designation")
            if (error) throw error
            return data as any[]
        }
    })

    // Fetch Regularization Lines (Sold without stock)
    const { data: physicalStats, isLoading: isLoadingPhysical } = useQuery({
        queryKey: ["physical-regularisation"],
        queryFn: async () => {
            // Get Devis and BL marked as regularisation
            const { data: blLines, error: blErr } = await supabase
                .from("bon_livraison_lignes")
                .select("*, bon_livraisons(numero, date, client:clients(raison_sociale))")
                .eq("is_regularisation", true)
            
            const { data: devisLines, error: devisErr } = await supabase
                .from("devis_lignes")
                .select("*, devis(numero, date, client:clients(raison_sociale))")
                .eq("is_regularisation", true)

            if (blErr || devisErr) throw blErr || devisErr

            return [
                ...(blLines || []).map((l: any) => ({ ...l, doc_numero: l.bon_livraisons.numero, doc_date: l.bon_livraisons.date, doc_client: l.bon_livraisons.client?.raison_sociale, type: "BL" })),
                ...(devisLines || []).map((l: any) => ({ ...l, doc_numero: l.devis.numero, doc_date: l.devis.date, doc_client: l.devis.client?.raison_sociale, type: "Devis" }))
            ].sort((a: any, b: any) => new Date(b.doc_date).getTime() - new Date(a.doc_date).getTime())
        }
    })

    if (isLoadingFiscal || isLoadingPhysical) return <LoadingScreen />

    // Only show items with deficit_fiscal OR searching
    const filteredFiscal = fiscalBalance?.filter(i => {
        const matchesAlert = i.deficit_fiscal;
        const matchesSearch = searchTerm === "" || 
            i.article_designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.article_code.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesAlert && matchesSearch;
    }) || []

    // Only show items with stock_physique <= 0 OR searching (Actually <= 0 is already filtered in original map but let's be consistent)
    const filteredPhysical = fiscalBalance?.filter(i => {
        const matchesAlert = i.stock_physique < 0; // Filter stricter: only negative
        const matchesSearch = searchTerm === "" || 
            i.article_designation.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesAlert && matchesSearch;
    }) || []

    const totalDeficitFiscal = fiscalBalance?.filter(i => i.deficit_fiscal).length || 0
    const totalDeficitPhysique = fiscalBalance?.filter(i => i.stock_physique < 0).length || 0

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-orange-600 uppercase italic">Régularisation & Balance</h2>
                    <p className="text-muted-foreground font-medium">Suivi de la conformité fiscale et de l&apos;équilibre des stocks.</p>
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Rechercher alertes..." 
                            className="pl-9 h-11 w-full md:w-64 border-orange-200 focus-visible:ring-orange-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Card className="bg-orange-50 border-orange-200">
                        <CardContent className="p-3 py-2 flex items-center gap-4">
                            <div className="p-2 bg-orange-600 rounded-lg text-white">
                                <Scale className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-orange-800 tracking-wider">Alertes Actives</p>
                                <p className="text-xl font-black text-orange-600">{totalDeficitPhysique + totalDeficitFiscal}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Tabs defaultValue="balance_fiscale" className="space-y-4">
                <TabsList className="bg-muted/50 p-1 rounded-xl h-12 border w-full md:w-auto">
                    <TabsTrigger value="balance_fiscale" className="flex-1 md:flex-none rounded-lg px-6 font-black uppercase text-[11px] tracking-widest data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all">
                        <Scale className="h-4 w-4 mr-2" /> Balance Fiscale ({filteredFiscal.length})
                    </TabsTrigger>
                    <TabsTrigger value="balance_physique" className="flex-1 md:flex-none rounded-lg px-6 font-black uppercase text-[11px] tracking-widest data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all">
                        <Package className="h-4 w-4 mr-2" /> Balance Physique ({filteredPhysical.length})
                    </TabsTrigger>
                    <TabsTrigger value="historique_reg" className="flex-1 md:flex-none rounded-lg px-6 font-black uppercase text-[11px] tracking-widest data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all">
                        <History className="h-4 w-4 mr-2" /> Opérations Forcées
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="balance_fiscale">
                    <Card className="border-t-4 border-t-orange-600 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl font-black flex items-center gap-2">
                                <Scale className="h-6 w-6 text-orange-600" />
                                ANALYSE DE LA CONFORMITÉ FISCALE
                            </CardTitle>
                            <CardDescription>
                                Cliquez sur un article pour voir les détails des mouvements.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-black text-[10px] uppercase">Article</TableHead>
                                        <TableHead className="text-center font-black text-[10px] uppercase">Dépôt</TableHead>
                                        <TableHead className="text-right font-black text-[10px] uppercase">Entrées TVA</TableHead>
                                        <TableHead className="text-right font-black text-[10px] uppercase">Sorties TVA</TableHead>
                                        <TableHead className="text-right font-black text-[10px] uppercase">Balance Fiscale</TableHead>
                                        <TableHead className="text-right font-black text-[10px] uppercase">État</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredFiscal.map((item, idx) => (
                                        <TableRow 
                                            key={idx} 
                                            className="hover:bg-orange-50 cursor-pointer group transition-colors"
                                            onClick={() => setSelectedItem({ 
                                                articleId: item.article_id, 
                                                depotId: item.depot_id,
                                                designation: item.article_designation
                                            })}
                                        >
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-sm group-hover:text-orange-600">{item.article_designation}</span>
                                                    <span className="text-[10px] text-muted-foreground font-mono uppercase">{item.article_code}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter">{item.depot_libelle}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="font-bold text-green-600">+{item.stock_tva >= 0 ? item.stock_tva : 0}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="font-bold text-red-600">-{item.stock_tva < 0 ? Math.abs(item.stock_tva) : 0}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={cn(
                                                    "font-black text-base px-2 py-1 rounded",
                                                    item.deficit_fiscal ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                                                )}>
                                                    {item.stock_tva}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge className="bg-red-600 text-white border-none">
                                                    <AlertTriangle className="h-3 w-3 mr-1" /> Déficit
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredFiscal.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-20">
                                                <div className="flex flex-col items-center gap-3 opacity-20">
                                                    <CheckCircle2 className="h-16 w-16 text-green-600" />
                                                    <p className="font-black uppercase tracking-widest text-sm">Tout est conforme fiscalement</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="balance_physique">
                    <Card className="border-t-4 border-t-blue-600 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl font-black flex items-center gap-2 text-blue-600">
                                <Package className="h-6 w-6" />
                                ÉQUILIBRE DU STOCK PHYSIQUE
                            </CardTitle>
                            <CardDescription>
                                État global du stock réel (cumul avec et sans TVA). Cliquez pour voir les détails.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-black text-[10px] uppercase">Article</TableHead>
                                        <TableHead className="text-center font-black text-[10px] uppercase">Dépôt</TableHead>
                                        <TableHead className="text-right font-black text-[10px] uppercase">Stock Disponible</TableHead>
                                        <TableHead className="text-right font-black text-[10px] uppercase">Urgence Achat</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPhysical.map((item, idx) => (
                                        <TableRow 
                                            key={idx} 
                                            className="hover:bg-blue-50 cursor-pointer group transition-colors"
                                            onClick={() => setSelectedItem({ 
                                                articleId: item.article_id, 
                                                depotId: item.depot_id,
                                                designation: item.article_designation
                                            })}
                                        >
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-sm group-hover:text-blue-600">{item.article_designation}</span>
                                                    <span className="text-[10px] text-muted-foreground font-mono uppercase">{item.article_code}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-xs">{item.depot_libelle}</TableCell>
                                            <TableCell className="text-right">
                                                <span className={cn(
                                                    "font-black text-lg px-2 rounded",
                                                    item.stock_physique < 0 ? "bg-red-600 text-white" : "bg-orange-500/10 text-orange-600"
                                                )}>
                                                    {item.stock_physique}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end text-red-600 font-black animate-pulse">
                                                    <ArrowUpCircle className="h-4 w-4 mr-1" /> Stock manquant
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredPhysical.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-20">
                                                <div className="flex flex-col items-center gap-3 opacity-20">
                                                    <CheckCircle2 className="h-16 w-16 text-blue-600" />
                                                    <p className="font-black uppercase tracking-widest text-sm">Fin de stock conforme</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="historique_reg">
                    <Card className="border-t-4 border-t-purple-600 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl font-black flex items-center gap-2 text-purple-600">
                                <History className="h-6 w-6" />
                                TRAÇABILITÉ DES OPÉRATIONS FORCÉES
                            </CardTitle>
                            <CardDescription>
                                Liste des lines validées en mode &quot;Régularisation&quot;.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-black text-[10px] uppercase">Document</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Client</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Article & Désignation</TableHead>
                                        <TableHead className="text-center font-black text-[10px] uppercase">Qté Forcée</TableHead>
                                        <TableHead className="text-right font-black text-[10px] uppercase">Date Opération</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {physicalStats?.map((line, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>
                                                <Badge className="bg-purple-600 text-white font-black">{line.type} {line.doc_numero}</Badge>
                                            </TableCell>
                                            <TableCell className="font-bold text-xs">{line.doc_client}</TableCell>
                                            <TableCell>
                                                <span className="font-bold text-xs">{line.designation}</span>
                                            </TableCell>
                                            <TableCell className="text-center font-black text-purple-600">
                                                {line.quantite}
                                            </TableCell>
                                            <TableCell className="text-right text-[10px] font-mono text-muted-foreground uppercase">
                                                {format(new Date(line.doc_date), "dd MMM yyyy", { locale: fr })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {physicalStats?.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-10">
                                                <div className="flex flex-col items-center gap-3 opacity-30">
                                                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                                                    <p className="font-black uppercase tracking-widest text-xs">Aucune opération forcée détectée</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <MouvementHistoryDialog 
                open={!!selectedItem}
                onOpenChange={(open) => !open && setSelectedItem(null)}
                articleId={selectedItem?.articleId || null}
                depotId={selectedItem?.depotId || null}
                articleDesignation={selectedItem?.designation || ""}
            />
        </div>
    )
}
