"use client"

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
import * as React from "react"
import { Plus, Trash2, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Article } from "@/types/database"

interface DocumentLinesProps {
  control: Control<any>
  watch: UseFormWatch<any>
  setValue: UseFormSetValue<any>
  articles: Article[]
  fieldName?: string
  inclureTva?: boolean
}

export function DocumentLines({
  control,
  watch,
  setValue,
  articles,
  fieldName = "lignes",
  inclureTva = false,
}: DocumentLinesProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldName,
  })

  const lignes = watch(fieldName) || []

  const totalTTC = lignes.reduce(
    (sum: number, l: any) => sum + (l.quantite || 0) * (l.prix_unitaire || 0),
    0
  )
  const totalHTCalc = inclureTva 
    ? lignes.reduce((s: number, l: any) => s + ((l.quantite || 0) * (l.prix_unitaire || 0)) / (1 + (l.tva || 0) / 100), 0)
    : totalTTC
  const totalTVA = totalTTC - totalHTCalc
  const totalHT = totalHTCalc

  function handleArticleSelect(index: number, articleId: string) {
    const article = articles.find((a) => a.id === articleId)
    if (article) {
      setValue(`${fieldName}.${index}.article_id`, article.id)
      setValue(`${fieldName}.${index}.designation`, article.designation)
      setValue(`${fieldName}.${index}.prix_unitaire`, article.prix_vente)
      setValue(`${fieldName}.${index}.tva`, article.tva)
      const qty = watch(`${fieldName}.${index}.quantite`) || 1
      setValue(`${fieldName}.${index}.montant_ht`, qty * article.prix_vente)
    }
  }

  function handleQtyChange(index: number, qty: number) {
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
    append({
      article_id: null,
      designation: "",
      quantite: 1,
      prix_unitaire: 0,
      tva: 20,
      montant_ht: 0,
      ordre: fields.length,
    })
  }

  const filterFn = (value: string, search: string) => {
    return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Article</TableHead>
              <TableHead>Désignation</TableHead>
              <TableHead className="w-[100px]">Qté</TableHead>
              <TableHead className="w-[120px]">Prix unit.</TableHead>
              {inclureTva && <TableHead className="w-[80px]">TVA %</TableHead>}
              <TableHead className="w-[120px] text-right">{inclureTva ? "Montant HT" : "Montant Total"}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => {
              const ligne = lignes[index] || {}
              const lineTTC = (ligne.quantite || 0) * (ligne.prix_unitaire || 0)
              const montantHTRow = inclureTva ? lineTTC / (1 + (ligne.tva || 0) / 100) : lineTTC

              return (
                <TableRow key={field.id}>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-[180px] justify-between h-8 px-2 font-normal text-left truncate"
                        >
                          {ligne.article_id
                            ? articles.find(a => a.id === ligne.article_id)?.designation || "Inconnu"
                            : "Choisir..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command filter={filterFn}>
                          <CommandInput placeholder="Nom, code, code barre..." />
                          <CommandList>
                            <CommandEmpty>Aucun article trouvé.</CommandEmpty>
                            <CommandGroup>
                              {articles.map((art) => {
                                const searchStr = `${art.code} ${art.reference || ''} ${art.code_barre || ''} ${art.designation}`
                                return (
                                  <CommandItem
                                    key={art.id}
                                    value={searchStr}
                                    onSelect={() => handleArticleSelect(index, art.id)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        ligne.article_id === art.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span>{art.designation}</span>
                                      <span className="text-xs text-muted-foreground">{art.reference || art.code} {art.code_barre && `| CB: ${art.code_barre}`}</span>
                                    </div>
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8"
                      {...control.register(`${fieldName}.${index}.designation`)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8"
                      value={ligne.quantite || ""}
                      onChange={(e) => handleQtyChange(index, parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8"
                      value={ligne.prix_unitaire || ""}
                      onChange={(e) => handlePrixChange(index, parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  {inclureTva && (
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8"
                        {...control.register(`${fieldName}.${index}.tva`, { valueAsNumber: true })}
                      />
                    </TableCell>
                  )}
                  <TableCell className="text-right font-medium">
                    {montantHTRow.toFixed(2)} MAD
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={inclureTva ? 5 : 4} className="text-right font-medium">
                {inclureTva ? "Total HT" : "Montant Total"}
              </TableCell>
              <TableCell className="text-right font-bold">
                {totalHT.toFixed(2)} MAD
              </TableCell>
              <TableCell />
            </TableRow>
            {inclureTva && (
              <TableRow>
                <TableCell colSpan={5} className="text-right font-medium">
                  TVA
                </TableCell>
                <TableCell className="text-right font-bold">
                  {totalTVA.toFixed(2)} MAD
                </TableCell>
                <TableCell />
              </TableRow>
            )}
            <TableRow>
              <TableCell colSpan={inclureTva ? 5 : 4} className="text-right font-medium text-lg">
                Net à Payer
              </TableCell>
              <TableCell className="text-right font-bold text-lg">
                {totalTTC.toFixed(2)} MAD
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <Button type="button" variant="outline" onClick={addLine}>
        <Plus className="mr-2 h-4 w-4" />
        Ajouter une ligne
      </Button>
    </div>
  )
}
