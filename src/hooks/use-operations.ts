"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export type Operation = {
    id: string
    date: string
    numero?: string
    type: "Vente" | "Achat" | "Retour Client" | "Retour Fournisseur" | "Vente POS" | "Paiement"
    tiers: string
    montant: number
    utilisateur: string
    statut?: string
    reference_id: string
    reference_type: string
    mode_paiement?: string
}

export function useOperations(startDate: string, endDate: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: ["operations", startDate, endDate],
        queryFn: async () => {
            // Fetch in parallel for performance
            const [
                { data: bl },
                { data: ba },
                { data: br },
                { data: bra },
                { data: pos },
                { data: paiements }
            ] = await Promise.all([
                supabase.from("bon_livraisons").select("id, date, numero, montant_ttc, client:clients(raison_sociale), commercial:profiles(nom, prenom)").gte("date", startDate).lte("date", endDate),
                supabase.from("bon_achats").select("id, date, numero, montant_ttc, fournisseur:fournisseurs(raison_sociale)").gte("date", startDate).lte("date", endDate),
                supabase.from("bon_retours").select("id, date, numero, montant_ttc, client:clients(raison_sociale)").gte("date", startDate).lte("date", endDate),
                supabase.from("bon_retour_achats").select("id, date, numero, montant_ttc, fournisseur:fournisseurs(raison_sociale)").gte("date", startDate).lte("date", endDate),
                supabase.from("ventes_pos").select("id, date, numero, montant_ttc, mode_paiement, client:clients(raison_sociale), commercial:profiles(nom, prenom)").gte("date", startDate).lte("date", endDate),
                supabase.from("paiements").select("id, date, montant, mode_paiement, reference_type, reference_id").gte("date", startDate).lte("date", endDate)
            ])

            const operations: Operation[] = [
                ...((bl as any[]) || []).map(d => ({
                    id: d.id,
                    date: d.date,
                    numero: d.numero,
                    type: "Vente" as const,
                    tiers: d.client ? (d.client as any).raison_sociale : "Client Inconnu",
                    montant: d.montant_ttc, // Vente = Entrée (+)
                    utilisateur: d.commercial ? `${(d.commercial as any).nom} ${(d.commercial as any).prenom}` : "Système",
                    reference_id: d.id,
                    reference_type: "bon_livraison"
                })),
                ...((ba as any[]) || []).map(d => ({
                    id: d.id,
                    date: d.date,
                    numero: d.numero,
                    type: "Achat" as const,
                    tiers: d.fournisseur ? (d.fournisseur as any).raison_sociale : "Fournisseur Inconnu",
                    montant: -d.montant_ttc, // Achat = Sortie (-)
                    utilisateur: "Admin",
                    reference_id: d.id,
                    reference_type: "bon_achat"
                })),
                ...((br as any[]) || []).map(d => ({
                    id: d.id,
                    date: d.date,
                    numero: d.numero,
                    type: "Retour Client" as const,
                    tiers: d.client ? (d.client as any).raison_sociale : "Client Inconnu",
                    montant: -d.montant_ttc, // Retour Client = Sortie (Remboursement -)
                    utilisateur: "Admin",
                    reference_id: d.id,
                    reference_type: "bon_retour"
                })),
                ...((bra as any[]) || []).map(d => ({
                    id: d.id,
                    date: d.date,
                    numero: d.numero,
                    type: "Retour Fournisseur" as const,
                    tiers: d.fournisseur ? (d.fournisseur as any).raison_sociale : "Fournisseur Inconnu",
                    montant: d.montant_ttc, // Retour Fournisseur = Entrée (Remboursement de fournisseur +)
                    utilisateur: "Admin",
                    reference_id: d.id,
                    reference_type: "bon_retour_achat"
                })),
                ...((pos as any[]) || []).map(d => ({
                    id: d.id,
                    date: d.date,
                    numero: d.numero,
                    type: "Vente POS" as const,
                    tiers: d.client ? (d.client as any).raison_sociale : "Comptoir",
                    montant: d.montant_ttc, // Vente = Entrée (+)
                    utilisateur: d.commercial ? `${(d.commercial as any).nom} ${(d.commercial as any).prenom}` : "Vendeur",
                    reference_id: d.id,
                    reference_type: "vente_pos",
                    mode_paiement: d.mode_paiement
                })),
                ...((paiements as any[]) || []).map(d => {
                    // Determiner le sens du paiement
                    // Un paiement sur un achat est une sortie. Un paiement sur une vente est une entrée.
                    const isSortie = ["bon_achat", "bon_retour", "depense"].includes(d.reference_type);
                    return {
                        id: d.id,
                        date: d.date,
                        numero: d.mode_paiement.toUpperCase(),
                        type: "Paiement" as const,
                        tiers: `Réf: ${d.reference_type}`,
                        montant: isSortie ? -d.montant : d.montant,
                        utilisateur: "Admin",
                        reference_id: d.reference_id,
                        reference_type: d.reference_type,
                        mode_paiement: d.mode_paiement
                    };
                })
            ]

            return operations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        },
        enabled: !!startDate && !!endDate,
    })
}
