"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { BonAchat } from "@/types/database"
import type { BonAchatFormData } from "@/lib/validations/documents"

export function useBonAchatList() {
    const supabase = createClient()
    return useQuery({
        queryKey: ["bon-achats"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bon_achats")
                .select("*, fournisseur:fournisseurs(*), depot:depots(*)")
                .order("created_at", { ascending: false })
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
    return useQuery({
        queryKey: ["bon-achats", "fournisseur", fournisseur_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bon_achats")
                .select("*, fournisseur:fournisseurs(*), depot:depots(*)")
                .eq("fournisseur_id", fournisseur_id)
                .order("created_at", { ascending: false })
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
            const montant_ht = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
            const montant_tva = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire * (l.tva / 100), 0)
            const montant_ttc = montant_ht + montant_tva

            const { data: numero } = await supabase.rpc("next_numero" as any, { p_type: "bon_achat" } as any)

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
                })
                .select().single()
            if (error) throw error

            const lignesData = lignes.map((l, i) => ({
                bon_achat_id: (ba as any).id, article_id: l.article_id || null,
                designation: l.designation, quantite: l.quantite, prix_unitaire: l.prix_unitaire,
                tva: l.tva, montant_ht: l.quantite * l.prix_unitaire, ordre: i,
            }))
            const { error: le } = await (supabase.from("bon_achat_lignes") as any).insert(lignesData)
            if (le) throw le

            for (const l of lignes) {
                if (l.article_id) {
                    await supabase.rpc("update_stock", {
                        p_article_id: l.article_id,
                        p_depot_id: formData.depot_id,
                        p_quantite: l.quantite,
                        p_type: "entree",
                        p_ref_type: "bon_achat",
                        p_ref_id: (ba as any).id
                    } as any)
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
            const montant_ht = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
            const montant_tva = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire * (l.tva / 100), 0)
            const montant_ttc = montant_ht + montant_tva

            const { data: ba, error } = await (supabase
                .from("bon_achats") as any)
                .update({
                    date: formData.date, fournisseur_id: formData.fournisseur_id,
                    bon_commande_id: formData.bon_commande_id || null, depot_id: formData.depot_id,
                    montant_ht, montant_tva, montant_ttc, notes: formData.notes || null,
                    tresorerie_id: formData.tresorerie_id || null,
                    mode_paiement: formData.mode_paiement || null,
                })
                .eq("id", id).select().single()
            if (error) throw error

            await supabase.from("bon_achat_lignes").delete().eq("bon_achat_id", id)
            const lignesData = lignes.map((l, i) => ({
                bon_achat_id: id, article_id: l.article_id || null,
                designation: l.designation, quantite: l.quantite, prix_unitaire: l.prix_unitaire,
                tva: l.tva, montant_ht: l.quantite * l.prix_unitaire, ordre: i,
            }))
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
