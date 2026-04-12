"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Devis } from "@/types/database"
import type { DevisFormData } from "@/lib/validations/documents"

export function useDevisList() {
  const supabase = createClient()

  return useQuery({
    queryKey: ["devis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devis")
        .select("*, client:clients(*), commercial:profiles(*)")
        .order("created_at", { ascending: false })
      if (error) throw error
      return data as Devis[]
    },
  })
}

export function useDevis(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ["devis", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devis")
        .select("*, client:clients(*), commercial:profiles(*), lignes:devis_lignes(*, article:articles(*))")
        .eq("id", id)
        .single()
      if (error) throw error
      return data as Devis
    },
    enabled: !!id,
  })
}

export function useDevisByClient(client_id: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ["devis", "client", client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devis")
        .select("*, client:clients(*), commercial:profiles(*)")
        .eq("client_id", client_id)
        .order("created_at", { ascending: false })
      if (error) throw error
      return data as Devis[]
    },
    enabled: !!client_id,
  })
}

export function useCreateDevis() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (formData: DevisFormData) => {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Non authentifié")

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single()
      if (!profile) throw new Error("Profil introuvable")

      // Get next numero
      const { data: numero } = await supabase.rpc("next_numero" as any, { p_type: "devis" } as any)

      const lignes = formData.lignes
      const montant_ht = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
      const montant_tva = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire * (l.tva / 100), 0)
      const montant_ttc = montant_ht + montant_tva

      // Create devis
      const { data: devis, error } = await (supabase
        .from("devis") as any)
        .insert({
          numero: numero || `DEV-${Date.now()}`,
          date: formData.date,
          client_id: formData.client_id,
          commercial_id: (profile as any).id,
          statut: "brouillon",
          montant_ht,
          montant_tva,
          montant_ttc,
          notes: formData.notes || null,
          validite_jours: formData.validite_jours,
        })
        .select()
        .single()
      if (error) throw error

      // Create lines
      const lignesData = lignes.map((l, i) => ({
        devis_id: (devis as any).id,
        article_id: l.article_id || null,
        designation: l.designation,
        quantite: l.quantite,
        prix_unitaire: l.prix_unitaire,
        tva: l.tva,
        montant_ht: l.quantite * l.prix_unitaire,
        ordre: i,
      }))

      const { error: lignesError } = await (supabase
        .from("devis_lignes") as any)
        .insert(lignesData)
      if (lignesError) throw lignesError

      return devis
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devis"] })
    },
  })
}

export function useUpdateDevis() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data: formData }: { id: string; data: DevisFormData }) => {
      const lignes = formData.lignes
      const montant_ht = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
      const montant_tva = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire * (l.tva / 100), 0)
      const montant_ttc = montant_ht + montant_tva

      // Update devis
      const { data: devis, error } = await (supabase
        .from("devis") as any)
        .update({
          date: formData.date,
          client_id: formData.client_id,
          montant_ht,
          montant_tva,
          montant_ttc,
          notes: formData.notes || null,
          validite_jours: formData.validite_jours,
        })
        .eq("id", id)
        .select()
        .single()
      if (error) throw error

      // Delete existing lines and re-insert
      await (supabase.from("devis_lignes") as any).delete().eq("devis_id", id)

      const lignesData = lignes.map((l, i) => ({
        devis_id: id,
        article_id: l.article_id || null,
        designation: l.designation,
        quantite: l.quantite,
        prix_unitaire: l.prix_unitaire,
        tva: l.tva,
        montant_ht: l.quantite * l.prix_unitaire,
        ordre: i,
      }))

      const { error: lignesError } = await (supabase
        .from("devis_lignes") as any)
        .insert(lignesData)
      if (lignesError) throw lignesError

      return devis
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devis"] })
    },
  })
}

export function useUpdateDevisStatut() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      if (statut === "accepte") {
        // Get first depot as default (or prompt user in future)
        const { data: depots } = await (supabase
          .from("depots") as any)
          .select("id")
          .limit(1)
        const depot_id = depots?.[0]?.id

        if (!depot_id) throw new Error("Aucun dépôt trouvé. Créez un dépôt avant d'accepter un devis.")

        // Call RPC to atomic accept
        const { error } = await (supabase.rpc as any)("accept_devis", {
          p_devis_id: id,
          p_depot_id: depot_id
        })
        if (error) throw error
      } else {
        // Normal update for other statuses
        const { error } = await (supabase
          .from("devis") as any)
          .update({ statut })
          .eq("id", id)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devis"] })
      queryClient.invalidateQueries({ queryKey: ["bon-livraisons"] })
    },
  })
}

export function useDeleteDevis() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("devis").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devis"] })
    },
  })
}
