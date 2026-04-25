import * as dbTools from "./db-tools"

export type AIProvider = "ollama" | "groq" | "gemini"

export interface AISettings {
  provider: AIProvider
  model?: string
  apiKey?: string
  ollamaHost?: string
  language?: string
}

export async function processAIChat(messages: any[], settings: AISettings) {
  try {
    const { provider, apiKey, model, ollamaHost } = settings
    
    // 1. Prepare system context and tools
    const schema = await dbTools.getDatabaseSchema()
    let stats = "No stats available"
    try {
      stats = await dbTools.getFleetStats()
    } catch (e) {
      console.warn("Could not fetch stats for AI context")
    }
    
    const systemPrompt = `
You are the ALT Digital Assistant, a helpful human-like office colleague.
LANGUAGE: Respond in the language of the user (French, Arabic, Darija, Spanish).

HUMAN PROTOCOLS:
- NEVER mention technical terms like "database", "functions", "args", "dbUpdateClient", or table names to the user.
- If you are just chatting (no action needed), be friendly, helpful, and human. Briefly answer questions or respond to greetings.
- IF YOU ARE PERFORMING AN ACTION (creating/updating), ONLY output the ACTION line. Do not say anything else; the system will confirm for you.
- ONLY list missing fields (Format: "Field : ") if they are MANDATORY for the requested action and you cannot proceed.

SYSTEM GUIDE & BUSINESS LOGIC:
1. MANDATORY FIELDS:
   - CLIENTS/SUPPLIERS: raison_sociale (Required).
   - ARTICLES: designation, famille_id, prix_vente (Required).
   - SALARIES: nom, prenom, matricule (Auto: MAT-XXXX).
2. DOCUMENT LIFE CYCLE:
   - SALES: Devis (Draft) -> Bon de Livraison (BL). BL validation triggers STOCK OUT.
   - PURCHASE: Bon de Commande -> Bon d'Achat (BA). BA validation triggers STOCK IN.
   - RETURNS: Bon de Retour (Client returns) triggers STOCK IN.
3. NOMENCLATURE (Strict Sequence):
   - Clients: CLI-0001, CLI-0002...
   - Suppliers: FOR-0001, FOR-0002...
   - Documents: DEV-2026-0001, BL-2026-0001, BA-2026-0001 format.
4. IDENTITY RULE: Never confuse entity types. A Fournisseur is NOT a Client.
5. ACTION RULE: Execute immediately if mandatory fields are present. Confirm with "Listo" or "Hecho".

ERP STRUCTURE:
- SALES: clients, devis, bon_livraisons, bon_retours.
- INVENTORY: articles, familles_articles, stock, depots, mouvements_stock.
- FINANCE: tresoreries (Caisse/Banque), mouvements_tresorerie, salaries.

CONTEXT:
Schema: ${schema}
Stats: ${stats}

AVAILABLE ACTIONS:
- dbCreateClient(data), dbUpdateClient(id, data)
- dbCreateFournisseur(data), dbUpdateFournisseur(id, data)
- dbCreateArticle(data), dbUpdateArticle(id, data)
- searchDatabase(query, table)
- getFleetStats() -> Get overview of the system.

If you need to act, you MUST output: ACTION: [function_name] args: [json_arguments].
`.trim()

    switch (provider) {
      case "ollama":
        return await callOllama(messages, systemPrompt, settings)
      case "groq":
        return await callGroq(messages, systemPrompt, settings)
      case "gemini":
        return await callGemini(messages, systemPrompt, settings)
      default:
        throw new Error("Provider not supported")
    }
  } catch (error: any) {
    console.error("Critical Error in processAIChat:", error)
    return { content: `Error crítico: ${error.message}. Por favor revisa la consola del servidor.` }
  }
}

async function callOllama(messages: any[], systemPrompt: string, settings: AISettings) {
  const host = settings.ollamaHost || process.env.OLLAMA_HOST || "http://178.104.221.175:11434"
  const model = settings.model || process.env.OLLAMA_MODEL || "llama3.1:8b"

  console.log(`Connecting to Ollama at ${host} with model ${model}`)

  const res = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: false
    })
  })
  const data = await res.json()
  return { content: data.message.content }
}

async function callGroq(messages: any[], systemPrompt: string, settings: AISettings) {
  if (!settings.apiKey) throw new Error("Groq API Key is missing")
  
  // Use a vision-capable model if an image is present
  const hasImage = messages.some(m => m.image)
  const model = settings.model || (hasImage ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile")

  console.log(`Calling Groq API (${hasImage ? 'Vision' : 'Text'}) with model:`, model)

  const mappedMessages = messages.map((m, i) => {
    const contentParts: any[] = []
    
    let text = m.content
    if (i === 0 && m.role === "user" && !messages.some(msg => msg.role === "system")) {
      // In OpenAI/Groq, we can use a system message separately or merge it
    }

    if (m.content) {
      contentParts.push({ type: "text", text: m.content })
    }

    if (m.image) {
      contentParts.push({
        type: "image_url",
        image_url: { url: m.image }
      })
    }

    return {
      role: m.role,
      content: contentParts.length === 1 && contentParts[0].type === "text" ? contentParts[0].text : contentParts
    }
  })

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...mappedMessages],
    })
  })
  
  const data = await res.json()
  if (data.error) throw new Error(`Groq Error: ${data.error.message}`)
  
  return { content: data.choices[0].message.content }
}

async function callGemini(messages: any[], systemPrompt: string, settings: AISettings) {
  if (!settings.apiKey) throw new Error("Gemini API Key is missing")
  
  // Use gemini-1.5-flash for multimodal capabilities
  const model = settings.model || "gemini-1.5-flash"

  console.log("Calling Gemini Vision API with model:", model)
  
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: messages
        .filter(m => m.content || m.image)
        .map((m, i) => {
          const parts: any[] = []
          
          if (m.content) {
            let text = m.content
            if (i === 0 && m.role === "user") {
              text = `SISTEMA: ${systemPrompt}\n\nUSUARIO: ${m.content}`
            }
            parts.push({ text })
          }
          
          if (m.image) {
            // Extract mime type and base64 data
            const match = m.image.match(/^data:(image\/\w+);base64,(.*)$/)
            if (match) {
              parts.push({
                inline_data: {
                  mime_type: match[1],
                  data: match[2]
                }
              })
            }
          }

          return {
            role: m.role === "assistant" ? "model" : "user",
            parts
          }
        })
        .filter((m, i) => i > 0 || m.role === "user")
    })
  })

  const data = await res.json()
  console.log("Gemini Raw Response:", JSON.stringify(data).substring(0, 500))

  if (data.error) {
    throw new Error(`Gemini Error (${data.error.code}): ${data.error.message}`)
  }

  if (!data.candidates || data.candidates.length === 0) {
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Gemini bloqueó el mensaje por: ${data.promptFeedback.blockReason}`)
    }
    throw new Error("Gemini no devolvió ninguna respuesta. Revisa tu cuota o seguridad.")
  }

  return { content: data.candidates[0].content.parts[0].text }
}
