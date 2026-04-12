"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { BonAchat } from "@/types/database"

export function useDettes() {
    const supabase = createClient()

    return useQuery({
        queryKey: ["dettes"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bon_achats")
                .select("*, fournisseur:fournisseurs(raison_sociale, code)")
                .neq("statut_paiement", "paye")
                .eq("statut", "valide")
                .order("date", { ascending: true })

            if (error) throw error
            return data as BonAchat[]
        },
    })
}
