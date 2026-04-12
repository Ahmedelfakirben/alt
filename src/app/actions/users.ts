"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Build an admin client. By using the secret service role key, we bypass RLS.
// This is strictly used in secure server components/actions.
const adminAuthClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function getAdminUsers() {
  try {
    const { data: { users }, error } = await adminAuthClient.auth.admin.listUsers()
    if (error) throw error
    
    const { data: profiles, error: profileError } = await adminAuthClient.from("profiles").select("*")
    if (profileError) throw profileError
    
    return users.map(user => {
       const profile = profiles.find(p => p.user_id === user.id)
       return {
         id: user.id,
         email: user.email,
         nom: profile?.nom || "",
         prenom: profile?.prenom || "",
         role: profile?.role || "Inconnu",
         created_at: user.created_at
       }
    }).filter(u => u.role === "admin")
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function createAdminUser(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const nom = formData.get("nom") as string
  const prenom = formData.get("prenom") as string

  if (!email || !password) return { error: "Email et mot de passe sont requis." }

  try {
    const { data, error } = await adminAuthClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm
    })
    
    if (error) throw error
    
    // There is a database trigger that auto-creates a basic profile. We update it.
    // We add a slight delay to ensure the database trigger has finished creating the row.
    await new Promise(r => setTimeout(r, 500))

    const { error: profileError } = await adminAuthClient.from('profiles').update({
      nom,
      prenom,
      role: 'admin'
    }).eq('user_id', data.user.id)
    
    if (profileError) throw profileError

    revalidatePath("/settings")
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteAdminUser(userId: string) {
  try {
    const { error } = await adminAuthClient.auth.admin.deleteUser(userId)
    if (error) throw error
    
    revalidatePath("/settings")
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
