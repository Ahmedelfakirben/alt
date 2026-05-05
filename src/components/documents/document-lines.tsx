"use client"

import * as React from "react"
import { useFieldArray, Control, UseFormSetValue, UseFormWatch } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { 
    Plus, 
    Trash2, 
    Check, 
    ChevronsUpDown, 
    Scan, 
    AlertCircle, 
    Search, 
    History, 
    Loader2, 
    AlertTriangle, 
    PackageSearch 
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Article } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CodesEntryModal } from "./codes-entry-modal"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { ArticleHistorySheet } from "@/components/articles/article-history-sheet"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { BarcodeScanner } from "@/components/ui/barcode-scanner"
import { Camera } from "lucide-react"

interface DocumentLinesProps {
  control: Control<any>
  watch: UseFormWatch<any>
  setValue: UseFormSetValue<any>
  articles: Article[]
  fieldName?: string
  inclureTva?: boolean
  docType?: "achat" | "bon_commande" | "bon_achat" | "bon_livraison" | "devis" | "bon_retour" | "bon_retour_achat" | "vente_pos"
}

export function DocumentLines({
  control,
  watch,
  setValue,
  articles,
  fieldName = "lignes",
  inclureTva = false,
  docType,
}: DocumentLinesProps) {
  const isPurchase = docType === "achat" || docType === "bon_commande" || docType === "bon_achat"
  const isSale = docType === "bon_livraison" || docType === "devis" || docType === "vente_pos"

  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldName,
  })

  const [activeTraceability, setActiveTraceability] = React.useState<number | null>(null)
  const [historyArticleId, setHistoryArticleId] = React.useState<string | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false)
  
  const isRegularisation = watch("is_regularisation") || false

  const [quickScanCode, setQuickScanCode] = React.useState("")
  const [isScanning, setIsScanning] = React.useState(false)
  const [isScannerOpen, setIsScannerOpen] = React.useState(false)
  const [scanningRowIndex, setScanningRowIndex] = React.useState<number | null>(null)
  const quickScanRef = React.useRef<HTMLInputElement>(null)

  const supabase = createClient()
  const lignes = watch(fieldName) || []

  // Filtered articles list
  const filteredArticles = React.useMemo(() => {
    // If it's a purchase or regularization mode is on, show all articles
    if (isPurchase || isRegularisation) return articles
    // Otherwise, if it's a sale, filter by stock. If not sale/purchase (like Return), show all.
    if (isSale) return articles.filter(a => ((a as any).stock_actuel || 0) > 0)
    return articles
  }, [articles, isPurchase, isRegularisation, isSale])

  // Total calculations
  const totalTTC = lignes.reduce(
    (sum: number, l: any) => sum + (l.quantite || 0) * (l.prix_unitaire || 0),
    0
  )
  const totalHTCalc = inclureTva 
    ? lignes.reduce((s: number, l: any) => s + ((l.quantite || 0) * (l.prix_unitaire || 0)) / (1 + (l.tva || 0) / 100), 0)
    : totalTTC
  const totalTVA = totalTTC - totalHTCalc
  const totalHT = totalHTCalc

  async function handleQuickScan(code: string) {
    if (!code) return
    setIsScanning(true)
    try {
      // Find article by custom RPC that handles any code type
      const { data, error } = await supabase.rpc("find_article_by_code", { p_search_code: code } as any)
      if (error) throw error
      
      const result = (Array.isArray(data) ? data[0] : data) as any
      if (result) {
        // Enforce stock check for sales NOT in regularization mode
        const stockActuel = result.stock_actuel || 0
        if (isSale && !isRegularisation && stockActuel <= 0) {
            toast.error(`Stock insuffisant pour ${result.designation}. Activez le mode Régularisation para forzar.`)
            return
        }

        // Find if article already in lines to increment qty instead of new line
        const existingIndex = lignes.findIndex((l: any) => l.article_id === result.article_id)
        if (existingIndex !== -1) {
            const currentQty = watch(`${fieldName}.${existingIndex}.quantite`) || 0
            
            // Re-check stock for the new total quantity
            if (isSale && !isRegularisation && (currentQty + 1) > stockActuel) {
                toast.error(`Stock insuffisant (${stockActuel}) para añadir más de ${result.designation}.`)
                return
            }

            handleQtyChange(existingIndex, currentQty + 1)
            toast.success(`Ajouté: ${result.designation} (+1)`)
        } else {
            append({
                article_id: result.article_id,
                designation: result.designation,
                quantite: 1,
                prix_unitaire: result.prix_vente,
                tva: result.tva,
                montant_ht: result.prix_vente,
                codes_articles: result.found_via === 'traceability' ? [code] : [],
                ordre: fields.length,
            })
            toast.success(`Cargado: ${result.designation}`)
        }
        setQuickScanCode("")
      } else {
        toast.error("Código no reconocido en la base de datos.")
      }
    } catch (e) {
      toast.error("Error al buscar el código.")
    } finally {
      setIsScanning(false)
    }
  }

  function handleArticleSelect(index: number, articleId: string) {
    const article = articles.find((a) => a.id === articleId)
    if (article) {
      const stockActuel = (article as any).stock_actuel || 0
      if (isSale && !isRegularisation && stockActuel <= 0) {
          toast.error("Cet article n'est pas en stock. Activez le mode Régularisation if necessary.")
          return
      }

      setValue(`${fieldName}.${index}.article_id`, article.id)
      setValue(`${fieldName}.${index}.designation`, article.designation)
      setValue(`${fieldName}.${index}.prix_unitaire`, article.prix_vente)
      setValue(`${fieldName}.${index}.tva`, article.tva)
      const qty = watch(`${fieldName}.${index}.quantite`) || 1
      setValue(`${fieldName}.${index}.montant_ht`, qty * article.prix_vente)
      setValue(`${fieldName}.${index}.codes_articles`, [])
    }
  }

  function handleQtyChange(index: number, qty: number) {
    const articleId = watch(`${fieldName}.${index}.article_id`)
    const article = articles.find(a => a.id === articleId)
    if (article && isSale && !isRegularisation) {
        const stockActuel = (article as any).stock_actuel || 0
        if (qty > stockActuel) {
            toast.error(`Stock limité à ${stockActuel} unidades.`)
            setValue(`${fieldName}.${index}.quantite`, stockActuel)
            const prix = watch(`${fieldName}.${index}.prix_unitaire`) || 0
            setValue(`${fieldName}.${index}.montant_ht`, stockActuel * prix)
            return
        }
    }

    setValue(`${fieldName}.${index}.quantite`, qty)
    const prix = watch(`${fieldName}.${index}.prix_unitaire`) || 0
    setValue(`${fieldName}.${index}.montant_ht`, qty * prix)
  }

  function handlePrixChange(index: number, prix: number) {
    setValue(`${fieldName}.${index}.prix_unitaire`, prix)
    const qty = watch(`${fieldName}.${index}.quantite`) || 0
    setValue(`${fieldName}.${index}.montant_ht`, qty * prix)
  }

  function addLine() {
    if (quickScanRef.current) {
        quickScanRef.current.focus()
        toast.info("Escanee o escriba el código del producto")
    } else {
        append({
            article_id: null,
            designation: "",
            quantite: 1,
            prix_unitaire: 0,
            tva: 20,
            montant_ht: 0,
            codes_articles: [],
            ordre: fields.length,
        })
    }
  }

  const filterFn = (value: string, search: string) => {
    return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
  }

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/30 p-4 rounded-xl border-2 border-dashed border-muted-foreground/10">
        <div className="relative flex-1 group flex items-center gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground group-focus-within:text-orange-600 transition-colors" />
                <Input 
                    ref={quickScanRef}
                    placeholder="Escaneo Rápido (Código, IMEI, SN...)" 
                    className="pl-10 h-11 bg-background border-none shadow-inner ring-offset-background focus-visible:ring-2 focus-visible:ring-orange-500 font-bold"
                    value={quickScanCode}
                    onChange={(e) => setQuickScanCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleQuickScan(quickScanCode))}
                    disabled={isScanning}
                />
                {isScanning && <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-orange-600" />}
            </div>
            
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-xl border-2 border-orange-500/20 text-orange-600 hover:bg-orange-500 hover:text-white transition-all shadow-sm"
                onClick={() => setIsScannerOpen(true)}
            >
                <Camera className="h-5 w-5" />
            </Button>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            {!isPurchase && (
                <div className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-lg border shadow-sm transition-colors",
                    isRegularisation ? "bg-red-50 border-red-200" : "bg-background"
                )}>
                    <Switch 
                        id="regularisation" 
                        checked={isRegularisation} 
                        onCheckedChange={(val) => setValue("is_regularisation", val)}
                        className="data-[state=checked]:bg-red-600"
                    />
                    <Label htmlFor="regularisation" className={cn(
                        "text-xs font-black uppercase tracking-wider cursor-pointer",
                        isRegularisation ? "text-red-700" : "text-muted-foreground"
                    )}>
                        Régularisation & Balance
                    </Label>
                </div>
            )}
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-lg overflow-hidden border-muted-foreground/10">
        <Table>
          <TableHeader className="bg-muted/80 h-12">
            <TableRow>
              <TableHead className="w-[250px] text-[11px] font-black uppercase tracking-widest px-6">Référence / Code</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-widest">Désignation & Traçabilidad</TableHead>
              <TableHead className="w-[100px] text-center text-[11px] font-black uppercase tracking-widest">Qté</TableHead>
              <TableHead className="w-[140px] text-[11px] font-black uppercase tracking-widest">Prix unit.</TableHead>
              {inclureTva && <TableHead className="w-[80px] text-[11px] font-black uppercase tracking-widest">TVA</TableHead>}
              <TableHead className="w-[140px] text-right text-[11px] font-black uppercase tracking-widest pr-6">{inclureTva ? "Total HT" : "Total"}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => {
              const ligne = lignes[index] || {}
              const article = articles.find(a => a.id === ligne.article_id)
              const codeType = article?.sous_famille?.type_code_requis
              const lineTTC = (ligne.quantite || 0) * (ligne.prix_unitaire || 0)
              const montantHTRow = inclureTva ? lineTTC / (1 + (ligne.tva || 0) / 100) : lineTTC
              const stockActuel = (article as any)?.stock_actuel || 0
              const isLowStock = ligne.article_id && stockActuel <= 0

              return (
                <TableRow key={field.id} className="group hover:bg-muted/30 transition-all border-b border-muted/50">
                  <TableCell className="align-top py-5 px-6">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1">
                            <div className="relative flex-1">
                                <Input 
                                    placeholder="Code / Barcode"
                                    className="h-10 font-mono text-xs border-2 focus-visible:ring-orange-500 pr-8"
                                    defaultValue={article?.code || ""}
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            const code = (e.target as HTMLInputElement).value
                                            if (code) {
                                                const { data } = await supabase.rpc("find_article_by_code", { p_search_code: code } as any)
                                                const result = (Array.isArray(data) ? data[0] : data) as any
                                                if (result) {
                                                    handleArticleSelect(index, result.article_id)
                                                    toast.success(`Produit trouvé: ${result.designation}`)
                                                } else {
                                                    toast.error("Code non trouvé")
                                                }
                                            }
                                        }
                                    }}
                                />
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-0 top-0 h-10 w-8 text-muted-foreground hover:text-orange-600"
                                        >
                                            <Search className="h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[380px] p-0" align="start">
                                        <Command filter={filterFn}>
                                        <CommandInput placeholder="Nom, code, code barre..." />
                                        <CommandList>
                                            <CommandEmpty>
                                                <div className="p-4 text-center">
                                                    <PackageSearch className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                                                    <p className="text-sm text-muted-foreground">Aucun article trouvé.</p>
                                                </div>
                                            </CommandEmpty>
                                            <CommandGroup className="p-1">
                                            {filteredArticles.map((art) => {
                                                const searchStr = `${art.code} ${art.reference || ''} ${art.code_barre || ''} ${art.designation}`
                                                const artStock = (art as any).stock_actuel || 0
                                                return (
                                                <CommandItem
                                                    key={art.id}
                                                    value={searchStr}
                                                    onSelect={() => handleArticleSelect(index, art.id)}
                                                    className="rounded-md p-2"
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4 text-orange-600", ligne.article_id === art.id ? "opacity-100" : "opacity-0")} />
                                                    <div className="flex-1 flex flex-col gap-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold text-sm">{art.designation}</span>
                                                            <Badge className={cn("text-[9px] h-4 px-1.5", artStock > 0 ? "bg-green-500/10 text-green-600 border-none" : "bg-destructive/10 text-destructive border-none")}>
                                                                Stock: {artStock}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase font-black tracking-widest">{art.reference || art.code}</span>
                                                        </div>
                                                    </div>
                                                </CommandItem>
                                                )
                                            })}
                                            </CommandGroup>
                                        </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 shrink-0 border-2 border-orange-500/20 text-orange-600 hover:bg-orange-500 hover:text-white transition-all hidden md:flex"
                                onClick={() => {
                                    setScanningRowIndex(index)
                                    setIsScannerOpen(true)
                                }}
                            >
                                <Camera className="h-4 w-4" />
                            </Button>
                        </div>
                        
                        {ligne.article_id && (
                            <div className="flex items-center gap-2 px-1">
                                <Button 
                                    type="button"
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 px-2 text-[10px] font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                    onClick={() => {
                                        setHistoryArticleId(ligne.article_id)
                                        setIsHistoryOpen(true)
                                    }}
                                >
                                    <History className="h-3 w-3 mr-1" /> Ver Historial
                                </Button>
                                {isLowStock && (
                                    <div className="flex items-center gap-1 text-[10px] text-destructive font-black uppercase">
                                        <AlertTriangle className="h-3.5 w-3.5" /> Sin Stock
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="align-top py-5 space-y-2">
                    <Input
                      className="h-10 focus-visible:ring-orange-500 font-medium"
                      {...control.register(`${fieldName}.${index}.designation`)}
                      placeholder="Désignation sur le document"
                    />
                    
                    {codeType && (
                      <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "h-9 flex-1 justify-between font-mono text-[10px] sm:text-xs border-2",
                              (ligne.codes_articles?.length || 0) < (ligne.quantite || 0) 
                                ? "border-destructive bg-destructive/5 text-destructive hover:bg-destructive/10" 
                                : "border-green-200 bg-green-50/50 text-green-700 hover:bg-green-100"
                            )}
                            onClick={() => setActiveTraceability(index)}
                          >
                            <span className="flex items-center gap-2">
                              <Scan className="h-4 w-4" />
                              {ligne.codes_articles?.length || 0} / {ligne.quantite || 0} {codeType}
                            </span>
                          </Button>

                          {(ligne.codes_articles?.length || 0) < (ligne.quantite || 0) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>Saisir los {ligne.quantite} códigos ({codeType})</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground ml-1">
                          Traçabilité exigée: <span className="font-black text-orange-600 italic tracking-wider uppercase">{codeType}</span>
                        </p>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="align-top py-5">
                    <Input
                      type="number"
                      step="0.01"
                      className="h-10 text-center font-black text-base"
                      value={ligne.quantite || ""}
                      onChange={(e) => handleQtyChange(index, parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell className="align-top py-5">
                    <Input
                      type="number"
                      step="0.01"
                      className="h-10 font-bold"
                      value={ligne.prix_unitaire || ""}
                      onChange={(e) => handlePrixChange(index, parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  {inclureTva && (
                    <TableCell className="align-top py-5">
                      <Input
                        type="number"
                        step="0.01"
                        className="h-10 text-center bg-muted/30 font-bold"
                        {...control.register(`${fieldName}.${index}.tva`, { valueAsNumber: true })}
                      />
                    </TableCell>
                  )}
                  <TableCell className="align-top py-5 text-right font-black text-base text-foreground/80 pt-6 pr-6">
                    {montantHTRow.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}<span className="text-[10px] ml-1 opacity-50">DH</span>
                  </TableCell>
                  <TableCell className="align-top py-5 px-6">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="h-10 w-10 p-0 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
          <TableFooter className="bg-muted/30 border-t-2">
            <TableRow>
              <TableCell colSpan={inclureTva ? 5 : 4} className="text-right font-black text-muted-foreground uppercase text-[10px] tracking-[0.2em] py-4">
                {inclureTva ? "Total HT" : "Montant Total"}
              </TableCell>
              <TableCell className="text-right font-black text-lg py-4 pr-6">
                {totalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
              </TableCell>
              <TableCell />
            </TableRow>
            {inclureTva && (
              <TableRow>
                <TableCell colSpan={5} className="text-right font-black text-muted-foreground uppercase text-[10px] tracking-[0.2em] py-4">
                  TVA
                </TableCell>
                <TableCell className="text-right font-black text-lg py-4 pr-6">
                  {totalTVA.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                </TableCell>
                <TableCell />
              </TableRow>
            )}
            <TableRow className="bg-orange-500/5 hover:bg-orange-500/5">
              <TableCell colSpan={inclureTva ? 5 : 4} className="text-right font-black text-orange-600 uppercase text-[11px] tracking-[0.3em] py-6">
                Net à Payer
              </TableCell>
              <TableCell className="text-right font-black text-2xl text-orange-600 italic py-6 pr-6">
                {totalTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <Button 
        type="button" 
        variant="outline" 
        onClick={addLine}
        className="w-full h-14 border-dashed border-2 bg-muted/5 hover:bg-orange-500/5 hover:border-orange-500 hover:text-orange-600 transition-all font-black uppercase tracking-widest text-xs"
      >
        <Plus className="mr-2 h-5 w-5" />
        Ajouter une ligne d'article
      </Button>

      {activeTraceability !== null && (
        <CodesEntryModal
            isOpen={true}
            onClose={() => setActiveTraceability(null)}
            onSave={(codes) => {
                setValue(`${fieldName}.${activeTraceability}.codes_articles`, codes)
            }}
            initialCodes={watch(`${fieldName}.${activeTraceability}.codes_articles`) || []}
            quantity={watch(`${fieldName}.${activeTraceability}.quantite`) || 1}
            label={articles.find(a => a.id === watch(`${fieldName}.${activeTraceability}.article_id`))?.sous_famille?.type_code_requis || "Code"}
            articleDesignation={watch(`${fieldName}.${activeTraceability}.designation`) || "Produit"}
        />
      )}

      <ArticleHistorySheet 
          articleId={historyArticleId}
          isOpen={isHistoryOpen}
          onOpenChange={setIsHistoryOpen}
      />

      {isScannerOpen && (
        <BarcodeScanner 
            onScan={async (code) => {
                if (scanningRowIndex !== null) {
                    const { data } = await supabase.rpc("find_article_by_code", { p_search_code: code } as any)
                    const result = (Array.isArray(data) ? data[0] : data) as any
                    if (result) {
                        handleArticleSelect(scanningRowIndex, result.article_id)
                        toast.success(`Cargado: ${result.designation}`)
                    } else {
                        toast.error("Código no encontrado")
                    }
                } else {
                    handleQuickScan(code)
                }
                setScanningRowIndex(null)
            }}
            onClose={() => {
                setIsScannerOpen(false)
                setScanningRowIndex(null)
            }}
            title={scanningRowIndex !== null ? "Escanear para esta línea" : "Escaneo de Producto"}
        />
      )}
    </div>
  )
}
