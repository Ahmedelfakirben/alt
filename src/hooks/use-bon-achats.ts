"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { BonAchat } from "@/types/database"
import type { BonAchatFormData } from "@/lib/validations/documents"
import { useFiscalMode } from "@/providers/fiscal-mode-context"

export function useBonAchatList() {
    const supabase = createClient()
    const { fiscalMode } = useFiscalMode()

    return useQuery({
        queryKey: ["bon-achats", fiscalMode],
        queryFn: async () => {
            let query = supabase
                .from("bon_achats")
                .select("*, fournisseur:fournisseurs(*), depot:depots(*)")
            
            if (fiscalMode) {
                query = query.eq("inclure_tva", true)
            }

            const { data, error } = await query.order("created_at", { ascending: false })
            if (error) throw error
            return data as BonAchat[]
        },
    })
}

export function useBonAchat(id: string) {
    const supabase = createClient()
    return useQuery({
        queryKey: ["bon-achats", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bon_achats")
                .select("*, fournisseur:fournisseurs(*), depot:depots(*), lignes:bon_achat_lignes(*, article:articles(*))")
                .eq("id", id)
                .single()
            if (error) throw error
            return data as BonAchat
        },
        enabled: !!id,
    })
}

export function useBonAchatsByFournisseur(fournisseur_id: string) {
    const supabase = createClient()
    const { fiscalMode } = useFiscalMode()

    return useQuery({
        queryKey: ["bon-achats", "fournisseur", fournisseur_id, fiscalMode],
        queryFn: async () => {
            let query = supabase
                .from("bon_achats")
                .select("*, fournisseur:fournisseurs(*), depot:depots(*)")
                .eq("fournisseur_id", fournisseur_id)
            
            if (fiscalMode) {
                query = query.eq("inclure_tva", true)
            }

            const { data, error } = await query.order("created_at", { ascending: false })
            if (error) throw error
            return data as BonAchat[]
        },
        enabled: !!fournisseur_id,
    })
}

export function useCreateBonAchat() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (formData: BonAchatFormData) => {
            const lignes = formData.lignes
            const montant_ttc = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
            const montant_ht = formData.inclure_tva
                ? lignes.reduce((s, l) => s + (l.quantite * l.prix_unitaire) / (1 + l.tva / 100), 0)
                : montant_ttc
            const montant_tva = montant_ttc - montant_ht

            const { data: numero } = await (supabase.rpc as any)("next_numero", { p_type: "bon_achat" })

            const { data: ba, error } = await (supabase
                .from("bon_achats") as any)
                .insert({
                    numero: numero || `BA-${Date.now()}`,
                    date: formData.date,
                    fournisseur_id: formData.fournisseur_id,
                    bon_commande_id: formData.bon_commande_id || null,
                    depot_id: formData.depot_id,
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
                    bon_achat_id: (ba as any).id, article_id: l.article_id || null,
                    designation: l.designation, quantite: l.quantite, prix_unitaire: l.prix_unitaire,
                    tva: l.tva, montant_ht: line_ht, ordre: i,
                }
            })
            const { error: le } = await (supabase.from("bon_achat_lignes") as any).insert(lignesData)
            if (le) throw le

            for (const l of lignes) {
                if (l.article_id) {
                    await (supabase.rpc as any)("update_stock", {
                        p_article_id: l.article_id,
                        p_depot_id: formData.depot_id,
                        p_quantite: l.quantite,
                        p_type: "entree",
                        p_ref_type: "bon_achat",
                        p_ref_id: (ba as any).id,
                        p_inclure_tva: formData.inclure_tva
                    })
                }
            }

            return ba
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bon-achats"] }) },
    })
}

export function useUpdateBonAchat() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data: formData }: { id: string; data: BonAchatFormData }) => {
            const lignes = formData.lignes
            const montant_ttc = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
            const montant_ht = formData.inclure_tva
                ? lignes.reduce((s, l) => s + (l.quantite * l.prix_unitaire) / (1 + l.tva / 100), 0)
                : montant_ttc
            const montant_tva = montant_ttc - montant_ht

            const { data: ba, error } = await (supabase
                .from("bon_achats") as any)
                .update({
                    date: formData.date, fournisseur_id: formData.fournisseur_id,
                    bon_commande_id: formData.bon_commande_id || null, depot_id: formData.depot_id,
                    montant_ht, montant_tva, montant_ttc, notes: formData.notes || null,
                    tresorerie_id: formData.tresorerie_id || null,
                    mode_paiement: formData.mode_paiement || null,
                    inclure_tva: formData.inclure_tva,
                })
                .eq("id", id).select().single()
            if (error) throw error

            await supabase.from("bon_achat_lignes").delete().eq("bon_achat_id", id)
            const lignesData = lignes.map((l, i) => {
                const line_ttc = l.quantite * l.prix_unitaire
                const line_ht = formData.inclure_tva ? line_ttc / (1 + l.tva / 100) : line_ttc
                return {
                    bon_achat_id: id, article_id: l.article_id || null,
                    designation: l.designation, quantite: l.quantite, prix_unitaire: l.prix_unitaire,
                    tva: l.tva, montant_ht: line_ht, ordre: i,
                }
            })
            const { error: le } = await (supabase.from("bon_achat_lignes") as any).insert(lignesData)
            if (le) throw le
            return ba
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bon-achats"] }) },
    })
}

export function useUpdateBonAchatStatut() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
            const { error } = await (supabase.from("bon_achats") as any).update({ statut }).eq("id", id)
            if (error) throw error
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bon-achats"] }) },
    })
}

export function useToggleBonAchatTVA() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, inclure_tva }: { id: string; inclure_tva: boolean }) => {
            const { data: ba, error: baError } = await supabase
                .from("bon_achats").select("*, lignes:bon_achat_lignes(*)").eq("id", id).single()
            if (baError) throw baError
            const lignes = (ba as any).lignes || []
            const montant_ttc = lignes.reduce((s: number, l: any) => s + l.quantite * l.prix_unitaire, 0)
            const montant_ht = inclure_tva
                ? lignes.reduce((s: number, l: any) => s + (l.quantite * l.prix_unitaire) / (1 + l.tva / 100), 0)
                : montant_ttc
            const montant_tva = montant_ttc - montant_ht
            const { error: updateError } = await (supabase.from("bon_achats") as any).update({
                inclure_tva, montant_ht, montant_tva, montant_ttc
            }).eq("id", id)
            if (updateError) throw updateError
            for (const l of lignes) {
                const line_ttc = l.quantite * l.prix_unitaire
                const line_ht = inclure_tva ? line_ttc / (1 + l.tva / 100) : line_ttc
                await (supabase.from("bon_achat_lignes") as any).update({ montant_ht: line_ht }).eq("id", l.id)
            }
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bon-achats"] }) },
    })
}

export function useDeleteBonAchat() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("bon_achats").delete().eq("id", id)
            if (error) throw error
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bon-achats"] }) },
    })
}
