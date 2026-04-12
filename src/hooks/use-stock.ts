"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Stock } from "@/types/database"

export function useStockList() {
    const supabase = createClient()

    return useQuery({
        queryKey: ["stock"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("stock")
                .select("*, article:articles(*), depot:depots(*)")
                .order("quantite", { ascending: true })
            if (error) throw error
            return data as Stock[]
        },
    })
}

export function useAdjustStock() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            articleId,
            depotId,
            quantity,
            type,
            notes
        }: {
            articleId: string
            depotId: string
            quantity: number
            type: "entree" | "sortie"
            notes?: string
        }) => {
            const { error } = await supabase.rpc("update_stock", {
                p_article_id: articleId,
                p_depot_id: depotId,
                p_quantite: quantity,
                p_type: type,
                p_ref_type: "ajustement_manuel",
                p_ref_id: articleId // Using article ID as ref for manual manual adjustment for now, or unrelated UUID
            } as any)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stock"] })
            queryClient.invalidateQueries({ queryKey: ["articles"] })
        },
    })
}

export function useStockByDepot(depot_id: string) {
    const supabase = createClient()
    return useQuery({
        queryKey: ["stock", "depot", depot_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("stock")
                .select("*, article:articles(*, famille:familles_articles(*)), depot:depots(*)")
                .eq("depot_id", depot_id)
                .order("quantite", { ascending: true })
            if (error) throw error
            return data as Stock[]
        },
        enabled: !!depot_id,
    })
}

export function useAjusterStock() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ article_id, depot_id, quantite }: { article_id: string; depot_id: string; quantite: number }) => {
            // Upsert stock
            const { data: existing } = await supabase
                .from("stock")
                .select("id, quantite")
                .eq("article_id", article_id)
                .eq("depot_id", depot_id)
                .maybeSingle()

            if (existing) {
                const { error } = await (supabase.from("stock") as any).update({ quantite }).eq("id", (existing as any).id)
                if (error) throw error
            } else {
                const { error } = await (supabase.from("stock") as any).insert({ article_id, depot_id, quantite })
                if (error) throw error
            }
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stock"] }) },
    })
}
