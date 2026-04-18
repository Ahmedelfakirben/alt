"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { BonRetour } from "@/types/database"
import type { BonRetourFormData } from "@/lib/validations/documents"
import { useFiscalMode } from "@/providers/fiscal-mode-context"

export function useBonRetourList() {
    const supabase = createClient()
    const { fiscalMode } = useFiscalMode()

    return useQuery({
        queryKey: ["bon-retours", fiscalMode],
        queryFn: async () => {
            let query = supabase
                .from("bon_retours")
                .select("*, client:clients(*), depot:depots(*)")
            
            if (fiscalMode) {
                query = query.eq("inclure_tva", true)
            }

            const { data, error } = await query.order("created_at", { ascending: false })
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
    const { fiscalMode } = useFiscalMode()
    
    return useQuery({
        queryKey: ["bon-retours", "client", client_id, fiscalMode],
        queryFn: async () => {
            let query = supabase
                .from("bon_retours")
                .select("*, client:clients(*), depot:depots(*)")
                .eq("client_id", client_id)
            
            if (fiscalMode) {
                query = query.eq("inclure_tva", true)
            }

            const { data, error } = await query.order("created_at", { ascending: false })
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
            const montant_ttc = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
            const montant_ht = formData.inclure_tva
                ? lignes.reduce((s, l) => s + (l.quantite * l.prix_unitaire) / (1 + l.tva / 100), 0)
                : montant_ttc
            const montant_tva = montant_ttc - montant_ht

            const { data: numero } = await (supabase.rpc as any)("next_numero", { p_type: "bon_retour" })

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
                    inclure_tva: formData.inclure_tva,
                })
                .select()
                .single()
            if (error) throw error

            const lignesData = lignes.map((l, i) => {
                const line_ttc = l.quantite * l.prix_unitaire
                const line_ht = formData.inclure_tva ? line_ttc / (1 + l.tva / 100) : line_ttc
                return {
                    bon_retour_id: (br as any).id,
                    article_id: l.article_id || null,
                    designation: l.designation,
                    quantite: l.quantite,
                    prix_unitaire: l.prix_unitaire,
                    tva: l.tva,
                    montant_ht: line_ht,
                    ordre: i,
                }
            })

            const { error: lignesError } = await (supabase
                .from("bon_retour_lignes") as any)
                .insert(lignesData)
            if (lignesError) throw lignesError

            for (const l of lignes) {
                if (l.article_id) {
                    await (supabase.rpc as any)("update_stock", {
                        p_article_id: l.article_id,
                        p_depot_id: formData.depot_id,
                        p_quantite: l.quantite,
                        p_type: "entree",
                        p_ref_type: "bon_retour",
                        p_ref_id: (br as any).id,
                        p_inclure_tva: formData.inclure_tva
                    })
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
            const montant_ttc = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
            const montant_ht = formData.inclure_tva
                ? lignes.reduce((s, l) => s + (l.quantite * l.prix_unitaire) / (1 + l.tva / 100), 0)
                : montant_ttc
            const montant_tva = montant_ttc - montant_ht

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
                    inclure_tva: formData.inclure_tva,
                })
                .eq("id", id)
                .select()
                .single()
            if (error) throw error

            await supabase.from("bon_retour_lignes").delete().eq("bon_retour_id", id)

            const lignesData = lignes.map((l, i) => {
                const line_ttc = l.quantite * l.prix_unitaire
                const line_ht = formData.inclure_tva ? line_ttc / (1 + l.tva / 100) : line_ttc
                return {
                    bon_retour_id: id,
                    article_id: l.article_id || null,
                    designation: l.designation,
                    quantite: l.quantite,
                    prix_unitaire: l.prix_unitaire,
                    tva: l.tva,
                    montant_ht: line_ht,
                    ordre: i,
                }
            })

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

export function useToggleBonRetourTVA() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, inclure_tva }: { id: string; inclure_tva: boolean }) => {
            const { data: br, error: brError } = await supabase
                .from("bon_retours")
                .select("*, lignes:bon_retour_lignes(*)")
                .eq("id", id)
                .single()
            if (brError) throw brError

            const lignes = (br as any).lignes || []
            const montant_ttc = lignes.reduce((s: number, l: any) => s + l.quantite * l.prix_unitaire, 0)
            const montant_ht = inclure_tva
                ? lignes.reduce((s: number, l: any) => s + (l.quantite * l.prix_unitaire) / (1 + l.tva / 100), 0)
                : montant_ttc
            const montant_tva = montant_ttc - montant_ht

            const { error: updateError } = await (supabase
                .from("bon_retours") as any)
                .update({
                    inclure_tva,
                    montant_ht,
                    montant_tva,
                    montant_ttc
                })
                .eq("id", id)
            if (updateError) throw updateError

            for (const l of lignes) {
                const line_ttc = l.quantite * l.prix_unitaire
                const line_ht = inclure_tva ? line_ttc / (1 + l.tva / 100) : line_ttc
                await (supabase.from("bon_retour_lignes") as any).update({ montant_ht: line_ht }).eq("id", l.id)
            }
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
