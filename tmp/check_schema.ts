import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
    console.log("Checking paiements table schema...")
    const { data, error } = await supabase
        .from("paiements")
        .select("*")
        .limit(1)
    
    if (error) {
        console.error("Error fetching from paiements:", error)
    } else {
        console.log("Columns found in paiements:", Object.keys(data[0] || {}))
    }
}

checkSchema()
