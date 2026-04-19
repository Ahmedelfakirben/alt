"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { articleSchema, type ArticleFormData } from "@/lib/validations/master-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"
import { useFamilles } from "@/hooks/use-familles"
import { useSousFamillesByFamille } from "@/hooks/use-sous-familles"
import type { Article } from "@/types/database"
import { useNextCode } from "@/hooks/use-next-code"
import { useEffect } from "react"

interface ArticleFormProps {
    defaultValues?: Article
    onSubmit: (data: ArticleFormData) => Promise<void>
    isLoading?: boolean
}

export function ArticleForm({ defaultValues, onSubmit, isLoading }: ArticleFormProps) {
    const { data: familles } = useFamilles()

    const form = useForm<ArticleFormData>({
        resolver: zodResolver(articleSchema) as any,
        defaultValues: {
            code: defaultValues?.code || "",
            reference: defaultValues?.reference || "",
            code_barre: defaultValues?.code_barre || "",
            designation: defaultValues?.designation || "",
            famille_id: defaultValues?.famille_id || "",
            sous_famille_id: defaultValues?.sous_famille_id || "",
            prix_achat: defaultValues?.prix_achat || 0,
            prix_vente: defaultValues?.prix_vente || 0,
            tva: defaultValues?.tva ?? 20,
            unite: defaultValues?.unite || "unité",
            seuil_alerte: defaultValues?.seuil_alerte || 0,
            actif: defaultValues?.actif ?? true,
        },
    })

    const selectedFamilleId = form.watch("famille_id")
    const { data: sousFamilles } = useSousFamillesByFamille(selectedFamilleId || "")

    const { data: nextCode, isLoading: isCodeLoading } = useNextCode("articles", "ART")

    useEffect(() => {
        if (!defaultValues && nextCode) {
            form.setValue("code", nextCode)
        }
    }, [nextCode, defaultValues, form])

    // Reset sous_famille if famille changes
    useEffect(() => {
        if (selectedFamilleId !== defaultValues?.famille_id) {
            form.setValue("sous_famille_id", "")
        }
    }, [selectedFamilleId, form, defaultValues])

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Informations générales</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Référence *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Génération auto..." {...field} readOnly className="bg-muted" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="code_barre"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Code Barre</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123456789..." {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="designation"
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Désignation *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nom de l'article" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="famille_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Famille</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner une famille" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {familles?.map((f) => (
                                                <SelectItem key={f.id} value={f.id}>
                                                    {f.code} - {f.libelle}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="sous_famille_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sous-Famille</FormLabel>
                                    <Select 
                                        onValueChange={field.onChange} 
                                        value={field.value || undefined}
                                        disabled={!selectedFamilleId}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={selectedFamilleId ? "Sélectionner une sous-famille" : "Sélectionnez d'abord une famille"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {sousFamilles?.map((sf) => (
                                                <SelectItem key={sf.id} value={sf.id}>
                                                    {sf.libelle}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="unite"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Unité *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="unité">Unité</SelectItem>
                                            <SelectItem value="kg">Kilogramme</SelectItem>
                                            <SelectItem value="litre">Litre</SelectItem>
                                            <SelectItem value="mètre">Mètre</SelectItem>
                                            <SelectItem value="m²">Mètre carré</SelectItem>
                                            <SelectItem value="lot">Lot</SelectItem>
                                            <SelectItem value="carton">Carton</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Tarification</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <FormField
                            control={form.control}
                            name="prix_achat"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Prix d&apos;achat (DH)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="prix_vente"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Prix de vente (DH)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="tva"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>TVA (%)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="0">0%</SelectItem>
                                            <SelectItem value="7">7%</SelectItem>
                                            <SelectItem value="10">10%</SelectItem>
                                            <SelectItem value="14">14%</SelectItem>
                                            <SelectItem value="20">20%</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Configuration supplémentaire</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="seuil_alerte"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Seuil d&apos;alerte</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="actif"
                            render={({ field }) => (
                                <FormItem className="flex items-center gap-3 space-y-0 pt-6">
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <FormLabel>Article actif</FormLabel>
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <div className="flex gap-4">
                    <Button type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-700">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {defaultValues ? "Mettre à jour" : "Créer l'article"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => window.history.back()}>
                        Annuler
                    </Button>
                </div>
            </form>
        </Form>
    )
}
