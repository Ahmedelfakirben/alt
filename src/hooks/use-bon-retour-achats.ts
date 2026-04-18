"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { BonRetourAchat } from "@/types/database"
import type { BonRetourAchatFormData } from "@/lib/validations/documents"
import { useFiscalMode } from "@/providers/fiscal-mode-context"

export function useBonRetourAchatList() {
    const supabase = createClient()
    const { fiscalMode } = useFiscalMode()

    return useQuery({
        queryKey: ["bon-retour-achats", fiscalMode],
        queryFn: async () => {
            let query = supabase
                .from("bon_retour_achats")
                .select("*, fournisseur:fournisseurs(*), depot:depots(*)")
            
            if (fiscalMode) {
                query = query.eq("inclure_tva", true)
            }

            const { data, error } = await query.order("created_at", { ascending: false })
            if (error) throw error
            return data as BonRetourAchat[]
        },
    })
}

export function useBonRetourAchat(id: string) {
    const supabase = createClient()
    return useQuery({
        queryKey: ["bon-retour-achats", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bon_retour_achats")
                .select("*, fournisseur:fournisseurs(*), depot:depots(*), lignes:bon_retour_achat_lignes(*, article:articles(*))")
                .eq("id", id)
                .single()
            if (error) throw error
            return data as BonRetourAchat
        },
        enabled: !!id,
    })
}

export function useBonRetourAchatsByFournisseur(fournisseur_id: string) {
    const supabase = createClient()
    const { fiscalMode } = useFiscalMode()

    return useQuery({
        queryKey: ["bon-retour-achats", "fournisseur", fournisseur_id, fiscalMode],
        queryFn: async () => {
            let query = supabase
                .from("bon_retour_achats")
                .select("*, fournisseur:fournisseurs(*), depot:depots(*)")
                .eq("fournisseur_id", fournisseur_id)
            
            if (fiscalMode) {
                query = query.eq("inclure_tva", true)
            }

            const { data, error } = await query.order("created_at", { ascending: false })
            if (error) throw error
            return data as BonRetourAchat[]
        },
        enabled: !!fournisseur_id,
    })
}

export function useCreateBonRetourAchat() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (formData: BonRetourAchatFormData) => {
            const lignes = formData.lignes
            const montant_ttc = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
            const montant_ht = formData.inclure_tva
                ? lignes.reduce((s, l) => s + (l.quantite * l.prix_unitaire) / (1 + l.tva / 100), 0)
                : montant_ttc
            const montant_tva = montant_ttc - montant_ht

            const { data: numero } = await (supabase.rpc as any)("next_numero", { p_type: "bon_retour_achat" })

            const { data: bra, error } = await (supabase
                .from("bon_retour_achats") as any)
                .insert({
                    numero: numero || `BRA-${Date.now()}`,
                    date: formData.date,
                    fournisseur_id: formData.fournisseur_id,
                    depot_id: formData.depot_id,
                    motif: formData.motif || null,
                    statut: "brouillon",
                    montant_ht, montant_tva, montant_ttc,
                    notes: formData.notes || null,
                    tresorerie_id: formData.tresorerie_id || null,
                    mode_paiement: formData.mode_paiement || null,
                    inclure_tva: formData.inclure_tva,
                })
                .select().single()
            if (error) throw error

            const lignesData = lignes.map((l, i) => {
                const line_ttc = l.quantite * l.prix_unitaire
                const line_ht = formData.inclure_tva ? line_ttc / (1 + l.tva / 100) : line_ttc
                return {
                    bon_retour_achat_id: (bra as any).id, article_id: l.article_id || null,
                    designation: l.designation, quantite: l.quantite, prix_unitaire: l.prix_unitaire,
                    tva: l.tva, montant_ht: line_ht, ordre: i,
                }
            })
            const { error: le } = await (supabase.from("bon_retour_achat_lignes") as any).insert(lignesData)
            if (le) throw le

            for (const l of lignes) {
                if (l.article_id) {
                    await (supabase.rpc as any)("update_stock", {
                        p_article_id: l.article_id,
                        p_depot_id: formData.depot_id,
                        p_quantite: l.quantite,
                        p_type: "sortie",
                        p_ref_type: "bon_retour_achat",
                        p_ref_id: (bra as any).id,
                        p_inclure_tva: formData.inclure_tva
                    })
                }
            }

            return bra
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bon-retour-achats"] }) },
    })
}

export function useUpdateBonRetourAchat() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data: formData }: { id: string; data: BonRetourAchatFormData }) => {
            const lignes = formData.lignes
            const montant_ttc = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
            const montant_ht = formData.inclure_tva
                ? lignes.reduce((s, l) => s + (l.quantite * l.prix_unitaire) / (1 + l.tva / 100), 0)
                : montant_ttc
            const montant_tva = montant_ttc - montant_ht

            const { data: bra, error } = await (supabase
                .from("bon_retour_achats") as any)
                .update({
                    date: formData.date, fournisseur_id: formData.fournisseur_id,
                    depot_id: formData.depot_id, motif: formData.motif || null,
                    notes: formData.notes || null,
                    tresorerie_id: formData.tresorerie_id || null,
                    mode_paiement: formData.mode_paiement || null,
                    inclure_tva: formData.inclure_tva,
                })
                .eq("id", id).select().single()
            if (error) throw error

            await supabase.from("bon_retour_achat_lignes").delete().eq("bon_retour_achat_id", id)
            const lignesData = lignes.map((l, i) => {
                const line_ttc = l.quantite * l.prix_unitaire
                const line_ht = formData.inclure_tva ? line_ttc / (1 + l.tva / 100) : line_ttc
                return {
                    bon_retour_achat_id: id, article_id: l.article_id || null,
                    designation: l.designation, quantite: l.quantite, prix_unitaire: l.prix_unitaire,
                    tva: l.tva, montant_ht: line_ht, ordre: i,
                }
            })
            const { error: le } = await (supabase.from("bon_retour_achat_lignes") as any).insert(lignesData)
            if (le) throw le
            return bra
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bon-retour-achats"] }) },
    })
}

export function useUpdateBonRetourAchatStatut() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
            const { error } = await (supabase.from("bon_retour_achats") as any).update({ statut }).eq("id", id)
            if (error) throw error
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bon-retour-achats"] }) },
    })
}

export function useToggleBonRetourAchatTVA() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, inclure_tva }: { id: string; inclure_tva: boolean }) => {
            const { data: bra, error: braError } = await supabase
                .from("bon_retour_achats").select("*, lignes:bon_retour_achat_lignes(*)").eq("id", id).single()
            if (braError) throw braError
            const lignes = (bra as any).lignes || []
            const montant_ttc = lignes.reduce((s: number, l: any) => s + l.quantite * l.prix_unitaire, 0)
            const montant_ht = inclure_tva
                ? lignes.reduce((s: number, l: any) => s + (l.quantite * l.prix_unitaire) / (1 + l.tva / 100), 0)
                : montant_ttc
            const montant_tva = montant_ttc - montant_ht
            const { error: updateError } = await (supabase.from("bon_retour_achats") as any).update({
                inclure_tva, montant_ht, montant_tva, montant_ttc
            }).eq("id", id)
            if (updateError) throw updateError
            for (const l of lignes) {
                const line_ttc = l.quantite * l.prix_unitaire
                const line_ht = inclure_tva ? line_ttc / (1 + l.tva / 100) : line_ttc
                await (supabase.from("bon_retour_achat_lignes") as any).update({ montant_ht: line_ht }).eq("id", l.id)
            }
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bon-retour-achats"] }) },
    })
}

export function useDeleteBonRetourAchat() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("bon_retour_achats").delete().eq("id", id)
            if (error) throw error
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bon-retour-achats"] }) },
    })
}
