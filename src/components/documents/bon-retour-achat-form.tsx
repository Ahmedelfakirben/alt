"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { bonRetourAchatSchema, type BonRetourAchatFormData } from "@/lib/validations/documents"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { DocumentLines } from "./document-lines"
import { useFournisseurs } from "@/hooks/use-fournisseurs"
import { useDepots } from "@/hooks/use-depots"
import { useTresoreries } from "@/hooks/use-tresoreries"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { BonRetourAchat, Article } from "@/types/database"

interface BonRetourAchatFormProps {
    defaultValues?: BonRetourAchat
    onSubmit: (data: BonRetourAchatFormData) => Promise<void>
    isLoading?: boolean
}

export function BonRetourAchatForm({ defaultValues, onSubmit, isLoading }: BonRetourAchatFormProps) {
    const { data: fournisseurs } = useFournisseurs()
    const { data: depots } = useDepots()
    const { data: tresoreries } = useTresoreries()
    const supabase = createClient()
    const { data: articles } = useQuery({
        queryKey: ["articles-active"],
        queryFn: async () => {
            const { data, error } = await supabase.from("articles").select("*").eq("actif", true).order("designation")
            if (error) throw error
            return data as Article[]
        },
    })

    const form = useForm<BonRetourAchatFormData>({
        resolver: zodResolver(bonRetourAchatSchema) as any,
        defaultValues: {
            date: defaultValues?.date || new Date().toISOString().split("T")[0],
            fournisseur_id: defaultValues?.fournisseur_id || "",
            depot_id: defaultValues?.depot_id || "",
            tresorerie_id: (defaultValues as any)?.tresorerie_id || "",
            mode_paiement: (defaultValues as any)?.mode_paiement || "",
            motif: defaultValues?.motif || "",
            notes: defaultValues?.notes || "",
            inclure_tva: defaultValues?.inclure_tva || false,
            lignes: defaultValues?.lignes?.map((l) => ({
                article_id: l.article_id, designation: l.designation, quantite: l.quantite,
                prix_unitaire: l.prix_unitaire, tva: l.tva, montant_ht: l.montant_ht, ordre: l.ordre,
            })) || [{ article_id: null, designation: "", quantite: 1, prix_unitaire: 0, tva: 20, montant_ht: 0, ordre: 0 }],
        },
    })

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Informations du bon de retour achat</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <FormField control={form.control} name="date" render={({ field }) => (
                            <FormItem><FormLabel>Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="fournisseur_id" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fournisseur *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un fournisseur" /></SelectTrigger></FormControl>
                                    <SelectContent>{fournisseurs?.map((f) => (<SelectItem key={f.id} value={f.id}>{f.code} - {f.raison_sociale}</SelectItem>))}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="depot_id" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Dépôt *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un dépôt" /></SelectTrigger></FormControl>
                                    <SelectContent>{depots?.map((d) => (<SelectItem key={d.id} value={d.id}>{d.code} - {d.libelle}</SelectItem>))}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="inclure_tva" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <FormLabel>Inclure TVA</FormLabel>
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Paiement</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <FormField control={form.control} name="tresorerie_id" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Trésorerie</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une trésorerie" /></SelectTrigger></FormControl>
                                    <SelectContent>{tresoreries?.map((t) => (<SelectItem key={t.id} value={t.id}>{t.code} - {t.libelle} ({t.type})</SelectItem>))}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="mode_paiement" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mode de paiement</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un mode" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="especes">Espèces</SelectItem>
                                        <SelectItem value="carte">Carte</SelectItem>
                                        <SelectItem value="cheque">Chèque</SelectItem>
                                        <SelectItem value="virement">Virement</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Motif du retour</CardTitle></CardHeader>
                    <CardContent>
                        <FormField control={form.control} name="motif" render={({ field }) => (
                            <FormItem><FormControl><Textarea placeholder="Motif du retour au fournisseur..." rows={2} {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Lignes</CardTitle></CardHeader>
                    <CardContent>
                        <DocumentLines
                            control={form.control}
                            watch={form.watch}
                            setValue={form.setValue}
                            articles={articles || []}
                            inclureTva={form.watch("inclure_tva")}
                        />
                        {form.formState.errors.lignes && <p className="text-sm text-destructive mt-2">{form.formState.errors.lignes.message || "Vérifiez les lignes"}</p>}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                    <CardContent>
                        <FormField control={form.control} name="notes" render={({ field }) => (
                            <FormItem><FormControl><Textarea placeholder="Notes..." rows={3} {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </CardContent>
                </Card>

                <div className="flex gap-4">
                    <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{defaultValues ? "Mettre à jour" : "Créer le bon de retour achat"}</Button>
                    <Button type="button" variant="outline" onClick={() => window.history.back()}>Annuler</Button>
                </div>
            </form>
        </Form>
    )
}
