import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

// Admin client to bypass RLS for AI operations
async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error("Missing Supabase admin credentials (URL or Service Role Key)");
  }

  return createClient(url, key);
}

// Helper to generate an ordered code for a table
async function generateOrderedCode(table: string, prefix: string) {
  try {
    const supabase = await createAdminClient()
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
    const nextNum = (count || 0) + 1
    return `${prefix}-${nextNum.toString().padStart(4, '0')}`
  } catch (e) {
    return `${prefix}-${Math.floor(Math.random() * 10000)}`
  }
}

/**
 * Gets a summary of the database schema for the AI context.
 */
export async function getDatabaseSchema() {
  return `
MANDATORY FIELDS & NOMENCLATURE:
1. CLIENTS: code (Auto: CLI-XXXX), raison_sociale (Required).
2. SUPPLIERS (Fournisseurs): code (Auto: FOR-XXXX), raison_sociale (Required).
3. ARTICLES: code (Auto: ART-XXXX), designation (Required), famille_id (Required), prix_vente (Required).
4. DOCUMENTS (BL, BA): numero (Required, Format: BL-YYYY-XXXX). Follow existing sequence.
Table: clients (id, code, raison_sociale, adresse, ville, telephone, email, ice)
Table: fournisseurs (id, code, raison_sociale, adresse, ville, telephone, email, ice)
Table: articles (id, code, designation, famille_id, prix_achat, prix_vente, tva, unite, seuil_alerte, actif)
Table: families_articles (id, code, libelle, description)
Table: stock (id, article_id, depot_id, quantite)
Table: bon_livraisons (id, numero, date, client_id, statut)
Table: tresoreries (id, code, libelle, solde)
`.trim();
}

/**
 * Generic search tool across multiple tables.
 */
export async function searchDatabase(query: string, table: string) {
  try {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from(table as any)
      .select("*")
      .ilike('libelle', `%${query}%`) // Try conventional fields or just list all
      .limit(10)

    // Fallback if ilike fails on non-text column
    if (error) {
      const { data: allData } = await supabase.from(table as any).select("*").limit(10)
      return JSON.stringify(allData)
    }
    return JSON.stringify(data)
  } catch (e) {
    return "Error: No se pudo acceder a la base de datos (Admin fail)."
  }
}

export async function dbCreateFournisseur(data: any) {
  try {
    const supabase = await createAdminClient()
    if (!data.code) {
      data.code = await generateOrderedCode('fournisseurs', 'FOR')
    }
    const { error } = await supabase.from('fournisseurs').insert(data)
    if (error) return `Error: ${error.message}`
    return `Success`
  } catch (e) { return "Error de conexión" }
}

export async function dbUpdateFournisseur(id: string, data: any) {
  try {
    const supabase = await createAdminClient()
    const { error } = await supabase.from('fournisseurs').update(data).eq('id', id)
    if (error) return `Error: ${error.message}`
    return "Success"
  } catch (e) { return "Error de conexión" }
}

/**
 * Execute a specialized summary query.
 */
export async function getFleetStats() {
  try {
    const supabase = await createAdminClient()
    
    // Fetch summary data
    const { count: clients } = await supabase.from('clients').select('*', { count: 'exact', head: true })
    const { count: articles } = await supabase.from('articles').select('*', { count: 'exact', head: true })
    const { data: treasury } = await supabase.from('tresoreries').select('libelle, solde')
    
    let treasuryText = treasury?.map(t => `${t.libelle}: ${t.solde}`).join(', ') || "Ninguna"

    return `Stats Overview:
- Clients: ${clients || 0}
- Articles: ${articles || 0}
- Accounts: ${treasuryText}`
  } catch (error) {
    console.error("Crash en getFleetStats:", error)
    return "Stats: Error crítico de conexión"
  }
}

export async function dbCreateClient(data: any) {
  try {
    const supabase = await createAdminClient()
    
    if (!data.code) {
      data.code = await generateOrderedCode('clients', 'CLI')
    }

    const { error } = await supabase.from('clients').insert(data)
    if (error) return `Error: ${error.message}`
    return `Success`
  } catch (e) { return "Error de conexión" }
}

export async function dbUpdateClient(id: string, data: any) {
  try {
    const supabase = await createAdminClient()
    const { error } = await supabase.from('clients' as any).update(data).eq('id', id)
    if (error) return `Error: ${error.message}`
    return "Success"
  } catch (e) { return "Error de conexión" }
}

export async function dbCreateArticle(data: any) {
  try {
    const supabase = await createAdminClient()
    
    if (!data.code) {
      data.code = await generateOrderedCode('articles', 'ART')
    }

    const { error } = await supabase.from('articles').insert(data)
    if (error) return `Error: ${error.message}`
    return `Success`
  } catch (e) { return "Error de conexión" }
}

export async function dbUpdateArticle(id: string, data: any) {
  try {
    const supabase = await createAdminClient()
    const { error } = await supabase.from('articles' as any).update(data).eq('id', id)
    if (error) return `Error: ${error.message}`
    return "Success"
  } catch (e) { return "Error de conexión" }
}
