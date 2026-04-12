"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export type Paiement = {
    id: string
    date: string
    montant: number
    mode_paiement: "especes" | "carte" | "cheque" | "virement"
    tresorerie_id: string
    reference_type: string
    reference_id: string
    note?: string
    created_at: string
    tresorerie?: {
        libelle: string
    }
}

export type PaiementFormData = {
    date: string
    montant: number
    mode_paiement: string
    tresorerie_id: string
    reference_type: string
    reference_id: string
    note?: string
}

export function usePaiements(referenceType: string, referenceId: string) {
    const supabase = createClient()
    const queryClient = useQueryClient()

    const queryKey = ["paiements", referenceType, referenceId]

    const query = useQuery({
        queryKey,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("paiements")
                .select("*, tresorerie:tresoreries(libelle)")
                .eq("reference_type", referenceType)
                .eq("reference_id", referenceId)
                .order("date", { ascending: false })

            if (error) throw error
            return data as Paiement[]
        },
    })

    const create = useMutation({
        mutationFn: async (data: PaiementFormData) => {
            // Check if adding this payment would exceed total
            // Optional safety check, but the trigger handles status update
            const { error } = await supabase.from("paiements").insert({
                ...data,
                mode_paiement: data.mode_paiement as any,
                note: data.note || null
            } as any)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey })
            // Invalidate document query to refresh status/remaining amount
            queryClient.invalidateQueries({ queryKey: [referenceType + "s"] }) // simple pluralization
            // Also invalidate single doc
            queryClient.invalidateQueries({ queryKey: [referenceType + "s", referenceId] })
            toast.success("Paiement ajouté avec succès")
        },
        onError: (error) => {
            console.error(error)
            toast.error("Erreur lors de l'ajout du paiement")
        }
    })

    const remove = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("paiements").delete().eq("id", id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey })
            queryClient.invalidateQueries({ queryKey: [referenceType + "s"] })
            queryClient.invalidateQueries({ queryKey: [referenceType + "s", referenceId] })
            toast.success("Paiement supprimé")
        },
        onError: (error) => {
            console.error(error)
            toast.error("Erreur lors de la suppression")
        }
    })

    return {
        ...query,
        create,
        remove
    }
}
