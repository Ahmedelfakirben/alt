export type UserRole = "admin" | "gerant" | "commercial" | "magasinier"

export type DocumentStatut = "brouillon" | "envoye" | "accepte" | "refuse" | "expire" | "valide" | "annule" | "recu"

export type TresorerieType = "caisse" | "banque"

export type ModePaiement = "especes" | "carte" | "cheque" | "virement"

export type MouvementType = "entree" | "sortie"

export interface Profile {
  id: string
  user_id: string
  nom: string
  prenom: string
  email: string
  role: UserRole
  avatar_url: string | null
  actif: boolean
  created_at: string
}

export interface Client {
  id: string
  code: string
  raison_sociale: string
  adresse: string | null
  ville: string | null
  telephone: string | null
  email: string | null
  ice: string | null
  created_at: string
  updated_at: string
}

export interface Fournisseur {
  id: string
  code: string
  raison_sociale: string
  adresse: string | null
  ville: string | null
  telephone: string | null
  email: string | null
  ice: string | null
  created_at: string
  updated_at: string
}

export interface FamilleArticle {
  id: string
  code: string
  libelle: string
  description: string | null
  created_at: string
}

export interface Article {
  id: string
  code: string
  reference: string | null
  code_barre: string | null
  designation: string
  famille_id: string | null
  prix_achat: number
  prix_vente: number
  tva: number
  unite: string
  seuil_alerte: number
  actif: boolean
  created_at: string
  updated_at: string
  famille?: FamilleArticle
  stock_actuel?: number
}

export interface Depot {
  id: string
  code: string
  libelle: string
  adresse: string | null
  responsable_id: string | null
  created_at: string
  responsable?: Profile
}

export interface Stock {
  id: string
  article_id: string
  depot_id: string
  quantite: number
  article?: Article
  depot?: Depot
}

export interface Salarie {
  id: string
  matricule: string
  nom: string
  prenom: string
  poste: string | null
  telephone: string | null
  email: string | null
  date_embauche: string | null
  salaire: number | null
  actif: boolean
  created_at: string
}

export interface Tresorerie {
  id: string
  code: string
  libelle: string
  type: TresorerieType
  solde: number
  created_at: string
}

// Documents de vente
export interface Devis {
  id: string
  numero: string
  date: string
  client_id: string
  commercial_id: string
  statut: DocumentStatut
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  notes: string | null
  validite_jours: number
  created_at: string
  updated_at: string
  client?: Client
  commercial?: Profile
  lignes?: DevisLigne[]
}

export interface DevisLigne {
  id: string
  devis_id: string
  article_id: string | null
  designation: string
  quantite: number
  prix_unitaire: number
  tva: number
  montant_ht: number
  ordre: number
  article?: Article
}

export interface BonLivraison {
  id: string
  numero: string
  date: string
  client_id: string
  devis_id: string | null
  depot_id: string
  statut: DocumentStatut
  statut_paiement?: "impaye" | "partiel" | "paye"
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  montant_regle?: number
  notes: string | null
  created_at: string
  client?: Client
  depot?: Depot
  lignes?: BonLivraisonLigne[]
}

export interface BonLivraisonLigne {
  id: string
  bon_livraison_id: string
  article_id: string | null
  designation: string
  quantite: number
  prix_unitaire: number
  tva: number
  montant_ht: number
  ordre: number
  article?: Article
}

export interface BonRetour {
  id: string
  numero: string
  date: string
  client_id: string
  bon_livraison_id: string | null
  depot_id: string
  motif: string | null
  statut: DocumentStatut
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  notes: string | null
  created_at: string
  client?: Client
  depot?: Depot
  lignes?: BonRetourLigne[]
}

export interface BonRetourLigne {
  id: string
  bon_retour_id: string
  article_id: string | null
  designation: string
  quantite: number
  prix_unitaire: number
  tva: number
  montant_ht: number
  ordre: number
}

// Documents d'achat
export interface BonCommande {
  id: string
  numero: string
  date: string
  fournisseur_id: string
  statut: DocumentStatut
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  notes: string | null
  created_at: string
  fournisseur?: Fournisseur
  lignes?: BonCommandeLigne[]
}

export interface BonCommandeLigne {
  id: string
  bon_commande_id: string
  article_id: string | null
  designation: string
  quantite: number
  prix_unitaire: number
  tva: number
  montant_ht: number
  ordre: number
}

export interface BonAchat {
  id: string
  numero: string
  date: string
  fournisseur_id: string
  bon_commande_id: string | null
  depot_id: string
  statut: DocumentStatut
  statut_paiement?: "impaye" | "partiel" | "paye"
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  montant_regle?: number
  notes: string | null
  created_at: string
  fournisseur?: Fournisseur
  depot?: Depot
  lignes?: BonAchatLigne[]
}

export interface BonAchatLigne {
  id: string
  bon_achat_id: string
  article_id: string | null
  designation: string
  quantite: number
  prix_unitaire: number
  tva: number
  montant_ht: number
  ordre: number
}

export interface BonRetourAchat {
  id: string
  numero: string
  date: string
  fournisseur_id: string
  depot_id: string
  motif: string | null
  statut: DocumentStatut
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  notes: string | null
  created_at: string
  fournisseur?: Fournisseur
  depot?: Depot
  lignes?: BonRetourAchatLigne[]
}

export interface BonRetourAchatLigne {
  id: string
  bon_retour_achat_id: string
  article_id: string | null
  designation: string
  quantite: number
  prix_unitaire: number
  tva: number
  montant_ht: number
  ordre: number
}

// POS
export interface VentePos {
  id: string
  numero: string
  date: string
  client_id: string | null
  commercial_id: string
  tresorerie_id: string
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  mode_paiement: ModePaiement
  depot_id: string
  created_at: string
  client?: Client
  commercial?: Profile
  tresorerie?: Tresorerie
  depot?: Depot
  lignes?: VentePosLigne[]
}

export interface VentePosLigne {
  id: string
  vente_pos_id: string
  article_id: string
  designation: string
  quantite: number
  prix_unitaire: number
  tva: number
  montant_ht: number
}

export interface MouvementStock {
  id: string
  article_id: string
  depot_id: string
  type: MouvementType
  quantite: number
  reference_type: string
  reference_id: string
  created_at: string
  article?: Article
  depot?: Depot
}

export interface MouvementTresorerie {
  id: string
  tresorerie_id: string
  type: MouvementType
  montant: number
  libelle: string
  reference_type: string | null
  reference_id: string | null
  created_at: string
  tresorerie?: Tresorerie
}

export interface Paiement {
  id: string
  date: string
  montant: number
  mode_paiement: ModePaiement
  tresorerie_id: string
  reference_type: string
  reference_id: string
  note: string | null
  created_at: string
  tresorerie?: Tresorerie
}

// Supabase Database type (simplified for SSR client)
// Note: Insert types must exclude relation properties (e.g. famille?, responsable?, client?, lignes?)
// because those are populated by Supabase joins, not actual DB columns.
// Update types use Partial<Row> because Supabase's internal generics derive query
// return types from the relationship between Row, Insert, and Update.
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, "id" | "created_at">; Update: Partial<Profile> }
      clients: { Row: Client; Insert: Omit<Client, "id" | "created_at" | "updated_at">; Update: Partial<Client> }
      fournisseurs: { Row: Fournisseur; Insert: Omit<Fournisseur, "id" | "created_at" | "updated_at">; Update: Partial<Fournisseur> }
      familles_articles: { Row: FamilleArticle; Insert: Omit<FamilleArticle, "id" | "created_at">; Update: Partial<FamilleArticle> }
      articles: { Row: Article; Insert: Omit<Article, "id" | "created_at" | "updated_at" | "famille">; Update: Partial<Article> }
      depots: { Row: Depot; Insert: Omit<Depot, "id" | "created_at" | "responsable">; Update: Partial<Depot> }
      stock: { Row: Stock; Insert: Omit<Stock, "id" | "article" | "depot">; Update: Partial<Stock> }
      salaries: { Row: Salarie; Insert: Omit<Salarie, "id" | "created_at">; Update: Partial<Salarie> }
      tresoreries: { Row: Tresorerie; Insert: Omit<Tresorerie, "id" | "created_at">; Update: Partial<Tresorerie> }
      devis: { Row: Devis; Insert: Omit<Devis, "id" | "created_at" | "updated_at" | "client" | "commercial" | "lignes">; Update: Partial<Devis> }
      devis_lignes: { Row: DevisLigne; Insert: Omit<DevisLigne, "id" | "article">; Update: Partial<DevisLigne> }
      bon_livraisons: { Row: BonLivraison; Insert: Omit<BonLivraison, "id" | "created_at" | "client" | "depot" | "lignes">; Update: Partial<BonLivraison> }
      bon_livraison_lignes: { Row: BonLivraisonLigne; Insert: Omit<BonLivraisonLigne, "id" | "article">; Update: Partial<BonLivraisonLigne> }
      bon_retours: { Row: BonRetour; Insert: Omit<BonRetour, "id" | "created_at" | "client" | "depot" | "lignes">; Update: Partial<BonRetour> }
      bon_retour_lignes: { Row: BonRetourLigne; Insert: Omit<BonRetourLigne, "id">; Update: Partial<BonRetourLigne> }
      bon_commandes: { Row: BonCommande; Insert: Omit<BonCommande, "id" | "created_at" | "fournisseur" | "lignes">; Update: Partial<BonCommande> }
      bon_commande_lignes: { Row: BonCommandeLigne; Insert: Omit<BonCommandeLigne, "id">; Update: Partial<BonCommandeLigne> }
      bon_achats: { Row: BonAchat; Insert: Omit<BonAchat, "id" | "created_at" | "fournisseur" | "depot" | "lignes">; Update: Partial<BonAchat> }
      bon_achat_lignes: { Row: BonAchatLigne; Insert: Omit<BonAchatLigne, "id">; Update: Partial<BonAchatLigne> }
      bon_retour_achats: { Row: BonRetourAchat; Insert: Omit<BonRetourAchat, "id" | "created_at" | "fournisseur" | "depot" | "lignes">; Update: Partial<BonRetourAchat> }
      bon_retour_achat_lignes: { Row: BonRetourAchatLigne; Insert: Omit<BonRetourAchatLigne, "id">; Update: Partial<BonRetourAchatLigne> }
      ventes_pos: { Row: VentePos; Insert: Omit<VentePos, "id" | "created_at" | "client" | "commercial" | "tresorerie" | "depot" | "lignes">; Update: Partial<VentePos> }
      vente_pos_lignes: { Row: VentePosLigne; Insert: Omit<VentePosLigne, "id">; Update: Partial<VentePosLigne> }
      mouvements_stock: { Row: MouvementStock; Insert: Omit<MouvementStock, "id" | "created_at" | "article" | "depot">; Update: Partial<MouvementStock> }
      mouvements_tresorerie: { Row: MouvementTresorerie; Insert: Omit<MouvementTresorerie, "id" | "created_at" | "tresorerie">; Update: Partial<MouvementTresorerie> }
      paiements: { Row: Paiement; Insert: Omit<Paiement, "id" | "created_at" | "tresorerie">; Update: Partial<Paiement> }
    }
  }
}

