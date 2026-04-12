"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export function useNextCode(table: "clients" | "fournisseurs" | "familles_articles" | "depots" | "articles", prefix: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ["next-code", table],
    queryFn: async () => {
      // Pour une garantie absolue contre la concurrence, la BD reste le meilleur endroit,
      // mais ceci est une approche frontend très courante.
      const { data, error } = await supabase
        .from(table)
        .select("code")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle() // Empêche l'erreur 406 Not Acceptable si la table est vide

      if (error) {
        console.error("Error fetching next code:", error)
        // Fallback temp
        return `${prefix}001`
      }

      if (!data) {
        return `${prefix}001`
      }

      const row = data as any

      // Par exemple data.code = 'CLI001' ou 'CLI-001'
      // Extraire tous les nombres de la chaîne
      const match = row.code.match(/\d+/)
      
      if (match) {
        const lastNumber = parseInt(match[0], 10)
        const nextNumber = lastNumber + 1
        // Formate à 3 chiffres (001, 002... 010...)
        const paddedNumber = String(nextNumber).padStart(3, '0')
        return `${prefix}${paddedNumber}`
      }

      // Fallback si pas de nombre trouvé
      return `${prefix}001`
    },
  })
}
