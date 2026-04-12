import { z } from "zod"

// POS - Vente au comptoir
const ventePosLigneSchema = z.object({
    article_id: z.string().min(1, "L'article est obligatoire"),
    designation: z.string().min(1, "La désignation est obligatoire"),
    quantite: z.coerce.number().min(1, "Quantité min 1"),
    prix_unitaire: z.coerce.number().min(0, "Le prix doit être positif"),
    tva: z.coerce.number().min(0).max(100).default(20),
    montant_ht: z.coerce.number().default(0),
})

export const ventePosSchema = z.object({
    client_id: z.string().optional().nullable(),
    tresorerie_id: z.string().min(1, "La trésorerie est obligatoire"),
    depot_id: z.string().min(1, "Le dépôt est obligatoire"),
    mode_paiement: z.enum(["especes", "carte", "cheque", "virement"]).default("especes"),
    lignes: z.array(ventePosLigneSchema).min(1, "Au moins un article est requis"),
})

export type VentePosFormData = z.infer<typeof ventePosSchema>
export type VentePosLigneFormData = z.infer<typeof ventePosLigneSchema>

// Mouvement de trésorerie
export const mouvementTresorerieSchema = z.object({
    tresorerie_id: z.string().min(1, "La trésorerie est obligatoire"),
    type: z.enum(["entree", "sortie"]),
    montant: z.coerce.number().min(0.01, "Le montant doit être supérieur à 0"),
    libelle: z.string().min(1, "Le libellé est obligatoire"),
    reference_type: z.string().optional().nullable(),
    reference_id: z.string().optional().nullable(),
})

export type MouvementTresorerieFormData = z.infer<typeof mouvementTresorerieSchema>
