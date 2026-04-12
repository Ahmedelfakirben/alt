"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { usePaiements } from "@/hooks/use-paiements"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, PlusCircle } from "lucide-react"
import { useTresoreries } from "@/hooks/use-tresoreries"

const paymentSchema = z.object({
    montant: z.coerce.number().min(0.01, "Le montant doit être positif"),
    date: z.string().min(1, "La date est requise"),
    mode_paiement: z.string().min(1, "Le mode est requis"),
    tresorerie_id: z.string().min(1, "La trésorerie est requise"),
    note: z.string().optional(),
})

type PaymentFormData = z.infer<typeof paymentSchema>

interface PaymentDialogProps {
    referenceType: "bon_livraison" | "bon_achat" | "bon_retour" | "bon_retour_achat"
    referenceId: string
    resteAPayer: number
    onSuccess?: () => void
}

export function PaymentDialog({ referenceType, referenceId, resteAPayer, onSuccess }: PaymentDialogProps) {
    const [open, setOpen] = useState(false)
    const { create } = usePaiements(referenceType, referenceId)
    const { data: tresoreries } = useTresoreries()

    const form = useForm<PaymentFormData>({
        resolver: zodResolver(paymentSchema) as any,
        defaultValues: {
            montant: resteAPayer,
            date: new Date().toISOString().split("T")[0],
            mode_paiement: "especes",
            tresorerie_id: "",
            note: "",
        },
    })

    async function onSubmit(data: PaymentFormData) {
        try {
            await create.mutateAsync({
                ...data,
                reference_type: referenceType,
                reference_id: referenceId,
            })
            setOpen(false)
            form.reset({
                montant: 0, // Will be updated when reopened if resteAPayer changes? No, controlled by parent usually
                date: new Date().toISOString().split("T")[0],
                mode_paiement: "especes",
                tresorerie_id: "",
                note: "",
            })
            if (onSuccess) onSuccess()
        } catch (e) {
            // Toast handled by hook
        }
    }

    // Update default amount when opening
    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen) {
            form.setValue("montant", resteAPayer)
        }
        setOpen(newOpen)
    }

    const isClient = ["bon_livraison", "bon_retour_achat"].includes(referenceType)
    const label = isClient ? "Encaisser" : "Payer"

    if (resteAPayer <= 0) return null

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {label}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{label} un montant</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="montant"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Montant (Reste: {resteAPayer.toFixed(2)} MAD)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="mode_paiement"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mode</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Mode" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="especes">Espèces</SelectItem>
                                                <SelectItem value="carte">Carte Bancaire</SelectItem>
                                                <SelectItem value="cheque">Chèque</SelectItem>
                                                <SelectItem value="virement">Virement</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="tresorerie_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Trésorerie</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Caisse/Banque" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {tresoreries?.map((t) => (
                                                    <SelectItem key={t.id} value={t.id}>
                                                        {t.libelle}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="note"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Note (Optionnel)</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={create.isPending}>
                            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmer
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
