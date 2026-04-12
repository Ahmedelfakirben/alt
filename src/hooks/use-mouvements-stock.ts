"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { MouvementStock } from "@/types/database"

export function useMouvementStockList() {
    const supabase = createClient()
    return useQuery({
        queryKey: ["mouvements-stock"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("mouvements_stock")
                .select("*, article:articles(*), depot:depots(*)")
                .order("created_at", { ascending: false })
                .limit(200)
            if (error) throw error
            return data as MouvementStock[]
        },
    })
}

export function useHistoriqueArticle(articleId: string) {
    const supabase = createClient()
    return useQuery({
        queryKey: ["historique-article", articleId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("mouvements_stock")
                .select("*, depot:depots(*)")
                .eq("article_id", articleId)
                .order("created_at", { ascending: false })
            if (error) throw error
            return data as MouvementStock[]
        },
        enabled: !!articleId,
    })
}
