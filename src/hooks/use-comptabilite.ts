"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export function useBalanceGenerale() {
    const supabase = createClient()
    return useQuery({
        queryKey: ["balance_generale"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("v_balance_generale")
                .select("*")
                .order("compte", { ascending: true })
            if (error) throw error
            return data
        }
    })
}

export function useGrandLivre() {
    const supabase = createClient()
    return useQuery({
        queryKey: ["grand_livre"],
        queryFn: async () => {
            // Fetch limit 500 for now or implement pagination
            const { data, error } = await supabase
                .from("v_grand_livre")
                .select("*")
                .order("date", { ascending: false })
                .limit(500)
            if (error) throw error
            return data
        }
    })
}
