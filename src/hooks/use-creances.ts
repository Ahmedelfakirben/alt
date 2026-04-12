"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { BonLivraison } from "@/types/database"

export function useCreances() {
    const supabase = createClient()

    return useQuery({
        queryKey: ["creances"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bon_livraisons")
                .select("*, client:clients(raison_sociale, code)")
                .neq("statut_paiement", "paye") // Fetch impaye and partiel
                .eq("statut", "valide") // Only validated docs
                .order("date", { ascending: true }) // Oldest first

            if (error) throw error
            return data as BonLivraison[]
        },
    })
}
