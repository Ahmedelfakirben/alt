"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { BonCommande } from "@/types/database"
import type { BonCommandeFormData } from "@/lib/validations/documents"

export function useBonCommandeList() {
    const supabase = createClient()
    return useQuery({
        queryKey: ["bon-commandes"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bon_commandes")
                .select("*, fournisseur:fournisseurs(*)")
                .order("created_at", { ascending: false })
            if (error) throw error
            return data as BonCommande[]
        },
    })
}

export function useBonCommande(id: string) {
    const supabase = createClient()
    return useQuery({
        queryKey: ["bon-commandes", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bon_commandes")
                .select("*, fournisseur:fournisseurs(*), lignes:bon_commande_lignes(*, article:articles(*)), bon_achats!bon_commande_id(*)")
                .eq("id", id)
                .single()
            if (error) throw error
            return data as BonCommande
        },
        enabled: !!id,
    })
}

export function useBonCommandesByFournisseur(fournisseur_id: string) {
    const supabase = createClient()
    return useQuery({
        queryKey: ["bon-commandes", "fournisseur", fournisseur_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bon_commandes")
                .select("*, fournisseur:fournisseurs(*)")
                .eq("fournisseur_id", fournisseur_id)
                .order("created_at", { ascending: false })
            if (error) throw error
            return data as BonCommande[]
        },
        enabled: !!fournisseur_id,
    })
}

export function useCreateBonCommande() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (formData: BonCommandeFormData) => {
            const lignes = formData.lignes
            const montant_ht = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
            const montant_tva = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire * (l.tva / 100), 0)
            const montant_ttc = montant_ht + montant_tva

            const { data: numero } = await supabase.rpc("next_numero" as any, { p_type: "bon_commande" } as any)

            const { data: bc, error } = await (supabase
                .from("bon_commandes") as any)
                .insert({
                    numero: numero || `BC-${Date.now()}`,
                    date: formData.date,
                    fournisseur_id: formData.fournisseur_id,
                    statut: "brouillon",
                    montant_ht, montant_tva, montant_ttc,
                    notes: formData.notes || null,
                })
                .select().single()
            if (error) throw error

            const lignesData = lignes.map((l, i) => ({
                bon_commande_id: (bc as any).id, article_id: l.article_id || null,
                designation: l.designation, quantite: l.quantite, prix_unitaire: l.prix_unitaire,
                tva: l.tva, montant_ht: l.quantite * l.prix_unitaire, ordre: i,
            }))
            const { error: le } = await (supabase.from("bon_commande_lignes") as any).insert(lignesData)
            if (le) throw le
            return bc
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bon-commandes"] }) },
    })
}

export function useUpdateBonCommande() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data: formData }: { id: string; data: BonCommandeFormData }) => {
            const lignes = formData.lignes
            const montant_ht = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
            const montant_tva = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire * (l.tva / 100), 0)
            const montant_ttc = montant_ht + montant_tva

            const { data: bc, error } = await (supabase
                .from("bon_commandes") as any)
                .update({
                    date: formData.date, fournisseur_id: formData.fournisseur_id,
                    montant_ht, montant_tva, montant_ttc, notes: formData.notes || null,
                })
                .eq("id", id).select().single()
            if (error) throw error

            await supabase.from("bon_commande_lignes").delete().eq("bon_commande_id", id)
            const lignesData = lignes.map((l, i) => ({
                bon_commande_id: id, article_id: l.article_id || null,
                designation: l.designation, quantite: l.quantite, prix_unitaire: l.prix_unitaire,
                tva: l.tva, montant_ht: l.quantite * l.prix_unitaire, ordre: i,
            }))
            const { error: le } = await (supabase.from("bon_commande_lignes") as any).insert(lignesData)
            if (le) throw le
            return bc
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bon-commandes"] }) },
    })
}

export function useUpdateBonCommandeStatut() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
            if (statut === "valide" || statut === "recu") {
                // Get first depot as default
                const { data: depots } = await (supabase
                    .from("depots") as any)
                    .select("id")
                    .limit(1)
                const depot_id = depots?.[0]?.id

                if (!depot_id) throw new Error("Aucun dépôt trouvé. Créez un dépôt avant de valider.")

                // Call RPC to atomic validate
                const { data, error } = await (supabase.rpc as any)("validate_bon_commande", {
                    p_bc_id: id,
                    p_depot_id: depot_id
                })
                if (error) throw error
                return data // Returns { success: true, ba_id: ... }
            } else {
                const { error } = await (supabase.from("bon_commandes") as any).update({ statut }).eq("id", id)
                if (error) throw error
                return null
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bon-commandes"] })
            queryClient.invalidateQueries({ queryKey: ["bon-achats"] })
        },
    })
}

export function useDeleteBonCommande() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("bon_commandes").delete().eq("id", id)
            if (error) throw error
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bon-commandes"] }) },
    })
}
