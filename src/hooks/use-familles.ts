"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { FamilleArticle } from "@/types/database"
import type { FamilleArticleFormData } from "@/lib/validations/master-data"

export function useFamilles() {
    const supabase = createClient()

    return useQuery({
        queryKey: ["familles"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("familles_articles")
                .select("*")
                .order("libelle")
            if (error) throw error
            return data as FamilleArticle[]
        },
    })
}

export function useFamille(id: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: ["familles", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("familles_articles")
                .select("*")
                .eq("id", id)
                .single()
            if (error) throw error
            return data as FamilleArticle
        },
        enabled: !!id,
    })
}

export function useCreateFamille() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (data: FamilleArticleFormData) => {
            const cleanData = Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, v === "" ? null : v])
            )
            const { data: result, error } = await supabase
                .from("familles_articles")
                .insert(cleanData as any)
                .select()
                .single()
            if (error) throw error
            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["familles"] })
        },
    })
}

export function useUpdateFamille() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: FamilleArticleFormData }) => {
            const { data: result, error } = await (supabase
                .from("familles_articles") as any)
                .update(data)
                .eq("id", id)
                .select()
                .single()
            if (error) throw error
            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["familles"] })
        },
    })
}

export function useDeleteFamille() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("familles_articles").delete().eq("id", id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["familles"] })
        },
    })
}
