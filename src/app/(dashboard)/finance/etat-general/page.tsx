"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/data-table/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
    Calendar, 
    Download, 
    TrendingUp, 
    TrendingDown, 
    Wallet,
    Users,
    FileText,
    Search
} from "lucide-react"
import { useOperations, Operation } from "@/hooks/use-operations"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfToday, endOfToday } from "date-fns"
import { fr } from "date-fns/locale"
import { generateEtatGeneralPDF } from "@/lib/pdf-etat-generator"
import { cn } from "@/lib/utils"

export default function EtatGeneralPage() {
    const [activeTab, setActiveTab] = useState("journalier")
    const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"))
    
    // Calculate date range based on tab
    const dateRange = useMemo(() => {
        const date = new Date(selectedDate)
        if (activeTab === "journalier") {
            return { 
                start: format(date, "yyyy-MM-dd"), 
                end: format(date, "yyyy-MM-dd"),
                label: format(date, "EEEE d MMMM yyyy", { locale: fr })
            }
        }
        if (activeTab === "hebdomadaire") {
            const start = startOfWeek(date, { weekStartsOn: 1 })
            const end = endOfWeek(date, { weekStartsOn: 1 })
            return { 
                start: format(start, "yyyy-MM-dd"), 
                end: format(end, "yyyy-MM-dd"),
                label: `Semaine du ${format(start, "d MMMM", { locale: fr })} au ${format(end, "d MMMM yyyy", { locale: fr })}`
            }
        }
        if (activeTab === "mensuel") {
            const start = startOfMonth(date)
            const end = endOfMonth(date)
            return { 
                start: format(start, "yyyy-MM-dd"), 
                end: format(end, "yyyy-MM-dd"),
                label: format(date, "MMMM yyyy", { locale: fr })
            }
        }
        return { start: "", end: "", label: "" }
    }, [selectedDate, activeTab])

    const { data: operations, isLoading } = useOperations(dateRange.start, dateRange.end)

    const stats = useMemo(() => {
        if (!operations) return { entries: 0, sorties: 0, balance: 0 }
        const entries = operations.filter(o => o.montant > 0).reduce((s, o) => s + o.montant, 0)
        const sorties = Math.abs(operations.filter(o => o.montant < 0).reduce((s, o) => s + o.montant, 0))
        return {
            entries,
            sorties,
            balance: entries - sorties
        }
    }, [operations])

    const columns: ColumnDef<Operation>[] = [
        {
            accessorKey: "date",
            header: "Date",
            cell: ({ row }) => format(new Date(row.original.date), "dd/MM/yyyy")
        },
        {
            accessorKey: "numero",
            header: "Référence",
            cell: ({ row }) => <span className="font-mono text-xs font-bold text-orange-600">{row.original.numero || '-'}</span>
        },
        {
            accessorKey: "type",
            header: "Type",
            cell: ({ row }) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    row.original.type === "Vente" || row.original.type === "Vente POS" ? "bg-green-100 text-green-700" :
                    row.original.type === "Achat" ? "bg-red-100 text-red-700" :
                    row.original.type === "Paiement" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                )}>
                    {row.original.type}
                </span>
            )
        },
        {
            accessorKey: "tiers",
            header: "Tiers / Libellé",
            cell: ({ row }) => <span className="font-medium">{row.original.tiers}</span>
        },
        {
            accessorKey: "utilisateur",
            header: "Utilisateur",
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5">
                    <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center">
                        <Users className="h-3 w-3 text-orange-600" />
                    </div>
                    <span className="text-xs">{row.original.utilisateur}</span>
                </div>
            )
        },
        {
            accessorKey: "mode_paiement",
            header: "Mode",
            cell: ({ row }) => (
                <span className="text-[10px] font-bold uppercase text-muted-foreground italic">
                    {row.original.mode_paiement || "-"}
                </span>
            )
        },
        {
            accessorKey: "montant",
            header: () => <div className="text-right">Montant</div>,
            cell: ({ row }) => (
                <div className={cn(
                    "text-right font-bold font-mono",
                    row.original.montant >= 0 ? "text-green-600" : "text-red-600"
                )}>
                    {row.original.montant >= 0 ? "+" : ""}{row.original.montant.toFixed(2)} DH
                </div>
            )
        }
    ]

    const handleDownloadPDF = () => {
        if (!operations) return
        const titles = {
            journalier: "ÉTAT JOURNALIER DES OPÉRATIONS",
            hebdomadaire: "ÉTAT HEBDOMADAIRE DES OPÉRATIONS",
            mensuel: "ÉTAT MENSUEL DES OPÉRATIONS"
        }
        generateEtatGeneralPDF(
            titles[activeTab as keyof typeof titles],
            dateRange.label,
            operations
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-orange-600 uppercase italic">État Général</h2>
                    <p className="text-muted-foreground">Vue d&apos;ensemble chronologique et financière de l&apos;activité</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-orange-500" />
                        <Input 
                            type={activeTab === "mensuel" ? "month" : "date"}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="pl-10 w-[200px] border-orange-200 focus-visible:ring-orange-500 shadow-sm"
                        />
                    </div>
                    <Button 
                        onClick={handleDownloadPDF} 
                        disabled={isLoading || !operations?.length}
                        className="bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-500/20"
                    >
                        <Download className="mr-2 h-4 w-4" /> PDF
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-green-100 bg-green-50/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-green-600 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Entrées / Encaissements
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-green-700">{stats.entries.toFixed(2)} DH</div>
                    </CardContent>
                </Card>
                <Card className="border-red-100 bg-red-50/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-2">
                            <TrendingDown className="h-4 w-4" /> Sorties / Décaissements
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-red-700">{stats.sorties.toFixed(2)} DH</div>
                    </CardContent>
                </Card>
                <Card className="border-orange-100 bg-orange-50/10 shadow-lg shadow-orange-500/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-2">
                            <Wallet className="h-4 w-4" /> Solde Net / Profit
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={cn(
                            "text-2xl font-black",
                            stats.balance >= 0 ? "text-orange-700" : "text-destructive"
                        )}>
                            {stats.balance.toFixed(2)} DH
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="flex items-center justify-between">
                    <TabsList className="bg-orange-50 p-1">
                        <TabsTrigger value="journalier" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white font-bold px-6">
                            Journalier
                        </TabsTrigger>
                        <TabsTrigger value="hebdomadaire" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white font-bold px-6">
                            Hebdomadaire
                        </TabsTrigger>
                        <TabsTrigger value="mensuel" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white font-bold px-6">
                            Mensuel
                        </TabsTrigger>
                    </TabsList>
                    
                    <div className="hidden md:flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-lg border border-orange-100">
                        <FileText className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-bold text-orange-800 italic">{dateRange.label}</span>
                    </div>
                </div>

                <TabsContent value="journalier">
                    <Card className="border-orange-100 shadow-sm">
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="text-sm flex items-center justify-between">
                                Liste des opérations du jour
                                <Badge variant="outline" className="ml-2 font-mono">{operations?.length || 0} op.</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {isLoading ? <div className="h-40 flex items-center justify-center"><LoadingScreen /></div> : (
                                <DataTable columns={columns} data={operations || []} searchPlaceholder="Filtrer par tiers ou réf..." />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="hebdomadaire">
                    <Card className="border-orange-100 shadow-sm">
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="text-sm">Rapport de la semaine</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {isLoading ? <div className="h-40 flex items-center justify-center"><LoadingScreen /></div> : (
                                <DataTable columns={columns} data={operations || []} searchPlaceholder="Rechercher..." />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="mensuel">
                    <Card className="border-orange-100 shadow-sm">
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="text-sm">Rapport mensuel détaillé</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {isLoading ? <div className="h-40 flex items-center justify-center"><LoadingScreen /></div> : (
                                <DataTable columns={columns} data={operations || []} searchPlaceholder="Rechercher..." />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function Badge({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "outline" }) {
    return (
        <span className={cn(
            "px-2.5 py-0.5 rounded-full text-xs font-semibold",
            variant === "outline" ? "border text-orange-600 border-orange-200 bg-orange-50/50" : "bg-orange-100 text-orange-700",
            className
        )}>
            {children}
        </span>
    )
}
