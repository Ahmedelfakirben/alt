"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { BonRetour } from "@/types/database"
import type { BonRetourFormData } from "@/lib/validations/documents"

export function useBonRetourList() {
    const supabase = createClient()

    return useQuery({
        queryKey: ["bon-retours"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bon_retours")
                .select("*, client:clients(*), depot:depots(*)")
                .order("created_at", { ascending: false })
            if (error) throw error
            return data as BonRetour[]
        },
    })
}

export function useBonRetour(id: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: ["bon-retours", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bon_retours")
                .select("*, client:clients(*), depot:depots(*), lignes:bon_retour_lignes(*, article:articles(*))")
                .eq("id", id)
                .single()
            if (error) throw error
            return data as BonRetour
        },
        enabled: !!id,
    })
}

export function useBonRetoursByClient(client_id: string) {
    const supabase = createClient()
    return useQuery({
        queryKey: ["bon-retours", "client", client_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bon_retours")
                .select("*, client:clients(*), depot:depots(*)")
                .eq("client_id", client_id)
                .order("created_at", { ascending: false })
            if (error) throw error
            return data as BonRetour[]
        },
        enabled: !!client_id,
    })
}

export function useCreateBonRetour() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (formData: BonRetourFormData) => {
            const lignes = formData.lignes
            const montant_ht = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
            const montant_tva = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire * (l.tva / 100), 0)
            const montant_ttc = montant_ht + montant_tva

            const { data: numero } = await supabase.rpc("next_numero" as any, { p_type: "bon_retour" } as any)

            const { data: br, error } = await (supabase
                .from("bon_retours") as any)
                .insert({
                    numero: numero || `BR-${Date.now()}`,
                    date: formData.date,
                    client_id: formData.client_id,
                    bon_livraison_id: formData.bon_livraison_id || null,
                    depot_id: formData.depot_id,
                    motif: formData.motif || null,
                    statut: "brouillon",
                    montant_ht,
                    montant_tva,
                    montant_ttc,
                    notes: formData.notes || null,
                    tresorerie_id: formData.tresorerie_id || null,
                    mode_paiement: formData.mode_paiement || null,
                })
                .select()
                .single()
            if (error) throw error

            const lignesData = lignes.map((l, i) => ({
                bon_retour_id: (br as any).id,
                article_id: l.article_id || null,
                designation: l.designation,
                quantite: l.quantite,
                prix_unitaire: l.prix_unitaire,
                tva: l.tva,
                montant_ht: l.quantite * l.prix_unitaire,
                ordre: i,
            }))

            const { error: lignesError } = await (supabase
                .from("bon_retour_lignes") as any)
                .insert(lignesData)
            if (lignesError) throw lignesError

            for (const l of lignes) {
                if (l.article_id) {
                    await supabase.rpc("update_stock", {
                        p_article_id: l.article_id,
                        p_depot_id: formData.depot_id,
                        p_quantite: l.quantite,
                        p_type: "entree",
                        p_ref_type: "bon_retour",
                        p_ref_id: (br as any).id
                    } as any)
                }
            }

            return br
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bon-retours"] })
        },
    })
}

export function useUpdateBonRetour() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, data: formData }: { id: string; data: BonRetourFormData }) => {
            const lignes = formData.lignes
            const montant_ht = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
            const montant_tva = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire * (l.tva / 100), 0)
            const montant_ttc = montant_ht + montant_tva

            const { data: br, error } = await (supabase
                .from("bon_retours") as any)
                .update({
                    date: formData.date,
                    client_id: formData.client_id,
                    bon_livraison_id: formData.bon_livraison_id || null,
                    depot_id: formData.depot_id,
                    motif: formData.motif || null,
                    montant_ht,
                    montant_tva,
                    montant_ttc,
                    notes: formData.notes || null,
                    tresorerie_id: formData.tresorerie_id || null,
                    mode_paiement: formData.mode_paiement || null,
                })
                .eq("id", id)
                .select()
                .single()
            if (error) throw error

            await supabase.from("bon_retour_lignes").delete().eq("bon_retour_id", id)

            const lignesData = lignes.map((l, i) => ({
                bon_retour_id: id,
                article_id: l.article_id || null,
                designation: l.designation,
                quantite: l.quantite,
                prix_unitaire: l.prix_unitaire,
                tva: l.tva,
                montant_ht: l.quantite * l.prix_unitaire,
                ordre: i,
            }))

            const { error: lignesError } = await (supabase
                .from("bon_retour_lignes") as any)
                .insert(lignesData)
            if (lignesError) throw lignesError

            return br
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bon-retours"] })
        },
    })
}

export function useUpdateBonRetourStatut() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
            const { error } = await (supabase
                .from("bon_retours") as any)
                .update({ statut })
                .eq("id", id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bon-retours"] })
        },
    })
}

export function useDeleteBonRetour() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("bon_retours").delete().eq("id", id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bon-retours"] })
        },
    })
}
