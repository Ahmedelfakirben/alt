"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { VentePos } from "@/types/database"
import type { VentePosFormData } from "@/lib/validations/operations"

export function useVentePosList() {
    const supabase = createClient()
    return useQuery({
        queryKey: ["ventes-pos"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("ventes_pos")
                .select("*, client:clients(*), commercial:profiles(*), tresorerie:tresoreries(*), depot:depots(*)")
                .order("created_at", { ascending: false })
            if (error) throw error
            return data as VentePos[]
        },
    })
}

export function useVentePos(id: string) {
    const supabase = createClient()
    return useQuery({
        queryKey: ["ventes-pos", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("ventes_pos")
                .select("*, client:clients(*), commercial:profiles(*), tresorerie:tresoreries(*), depot:depots(*), lignes:vente_pos_lignes(*, article:articles(*))")
                .eq("id", id)
                .single()
            if (error) throw error
            return data as VentePos
        },
        enabled: !!id,
    })
}

export function useCreateVentePos() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ formData, commercial_id }: { formData: VentePosFormData; commercial_id: string }) => {
            const lignes = formData.lignes
            const montant_ht = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
            const montant_tva = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire * (l.tva / 100), 0)
            const montant_ttc = montant_ht + montant_tva

            const { data: numero } = await supabase.rpc("next_numero" as any, { p_type: "vente_pos" } as any)

            const { data: vente, error } = await (supabase
                .from("ventes_pos") as any)
                .insert({
                    numero: numero || `VP-${Date.now()}`,
                    date: new Date().toISOString().split("T")[0],
                    client_id: formData.client_id || null,
                    commercial_id, tresorerie_id: formData.tresorerie_id,
                    depot_id: formData.depot_id,
                    montant_ht, montant_tva, montant_ttc,
                    mode_paiement: formData.mode_paiement,
                })
                .select().single()
            if (error) throw error

            const lignesData = lignes.map((l) => ({
                vente_pos_id: (vente as any).id, article_id: l.article_id,
                designation: l.designation, quantite: l.quantite, prix_unitaire: l.prix_unitaire,
                tva: l.tva, montant_ht: l.quantite * l.prix_unitaire,
            }))
            const { error: le } = await (supabase
                .from("vente_pos_lignes") as any)
                .insert(lignesData)
            if (le) throw le
            return vente
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ventes-pos"] }) },
    })
}

export function useDeleteVentePos() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("ventes_pos").delete().eq("id", id)
            if (error) throw error
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ventes-pos"] }) },
    })
}
