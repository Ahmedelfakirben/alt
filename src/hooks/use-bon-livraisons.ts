"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { BonLivraison } from "@/types/database"
import type { BonLivraisonFormData } from "@/lib/validations/documents"

export function useBonLivraisonList() {
    const supabase = createClient()

    return useQuery({
        queryKey: ["bon-livraisons"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bon_livraisons")
                .select("*, client:clients(*), depot:depots(*)")
                .order("created_at", { ascending: false })
            if (error) throw error
            return data as BonLivraison[]
        },
    })
}

export function useBonLivraison(id: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: ["bon-livraisons", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bon_livraisons")
                .select("*, client:clients(*), depot:depots(*), lignes:bon_livraison_lignes(*, article:articles(*))")
                .eq("id", id)
                .single()
            if (error) throw error
            return data as BonLivraison
        },
        enabled: !!id,
    })
}

export function useBonLivraisonsByClient(client_id: string) {
    const supabase = createClient()
    return useQuery({
        queryKey: ["bon-livraisons", "client", client_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bon_livraisons")
                .select("*, client:clients(*), depot:depots(*)")
                .eq("client_id", client_id)
                .order("created_at", { ascending: false })
            if (error) throw error
            return data as BonLivraison[]
        },
        enabled: !!client_id,
    })
}

export function useCreateBonLivraison() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (formData: BonLivraisonFormData) => {
            const lignes = formData.lignes
            const montant_ht = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
            const montant_tva = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire * (l.tva / 100), 0)
            const montant_ttc = montant_ht + montant_tva

            const { data: numero } = await supabase.rpc("next_numero" as any, { p_type: "bon_livraison" } as any)

            const { data: bl, error } = await (supabase
                .from("bon_livraisons") as any)
                .insert({
                    numero: numero || `BL-${Date.now()}`,
                    date: formData.date,
                    client_id: formData.client_id,
                    devis_id: formData.devis_id || null,
                    depot_id: formData.depot_id,
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
                bon_livraison_id: (bl as any).id,
                article_id: l.article_id || null,
                designation: l.designation,
                quantite: l.quantite,
                prix_unitaire: l.prix_unitaire,
                tva: l.tva,
                montant_ht: l.quantite * l.prix_unitaire,
                ordre: i,
            }))

            const { error: lignesError } = await (supabase
                .from("bon_livraison_lignes") as any)
                .insert(lignesData)
            if (lignesError) throw lignesError

            for (const l of lignes) {
                if (l.article_id) {
                    await supabase.rpc("update_stock", {
                        p_article_id: l.article_id,
                        p_depot_id: formData.depot_id,
                        p_quantite: l.quantite,
                        p_type: "sortie",
                        p_ref_type: "bon_livraison",
                        p_ref_id: (bl as any).id
                    } as any)
                }
            }

            return bl
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bon-livraisons"] })
        },
    })
}

export function useUpdateBonLivraison() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, data: formData }: { id: string; data: BonLivraisonFormData }) => {
            const lignes = formData.lignes
            const montant_ht = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
            const montant_tva = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire * (l.tva / 100), 0)
            const montant_ttc = montant_ht + montant_tva

            const { data: bl, error } = await (supabase
                .from("bon_livraisons") as any)
                .update({
                    date: formData.date,
                    client_id: formData.client_id,
                    devis_id: formData.devis_id || null,
                    depot_id: formData.depot_id,
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

            await supabase.from("bon_livraison_lignes").delete().eq("bon_livraison_id", id)

            const lignesData = lignes.map((l, i) => ({
                bon_livraison_id: id,
                article_id: l.article_id || null,
                designation: l.designation,
                quantite: l.quantite,
                prix_unitaire: l.prix_unitaire,
                tva: l.tva,
                montant_ht: l.quantite * l.prix_unitaire,
                ordre: i,
            }))

            const { error: lignesError } = await (supabase
                .from("bon_livraison_lignes") as any)
                .insert(lignesData)
            if (lignesError) throw lignesError

            return bl
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bon-livraisons"] })
        },
    })
}

export function useUpdateBonLivraisonStatut() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
            const { error } = await (supabase
                .from("bon_livraisons") as any)
                .update({ statut })
                .eq("id", id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bon-livraisons"] })
        },
    })
}

export function useDeleteBonLivraison() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("bon_livraisons").delete().eq("id", id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bon-livraisons"] })
        },
    })
}
