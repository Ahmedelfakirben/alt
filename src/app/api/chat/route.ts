import { NextRequest, NextResponse } from "next/server"
import { processAIChat, AISettings } from "@/lib/ai/ai-service"
import * as dbTools from "@/lib/ai/db-tools"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, settings } = body as { messages: any[], settings: AISettings }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await processAIChat(messages, settings)
          let content = result.content
          
          // ACTION EXECUTOR
          if (content.includes("ACTION:")) {
            const actionMatch = content.match(/ACTION:\s*(\w+)\s*args:\s*({.*})/)
            if (actionMatch) {
              const actionName = actionMatch[1]
              const args = JSON.parse(actionMatch[2])
              
              console.log(`Executing AI Action: ${actionName}`, args)
              
              const tool = (dbTools as any)[actionName]
              if (tool) {
                // Call tool with the full args object for creation, or specific params for updates
                let toolResult = ""
                if (actionName.includes("Update")) {
                  toolResult = await tool(args.id, args.data || args)
                } else {
                  toolResult = await tool(args)
                }

                if (toolResult === "Success") {
                  const lang = settings.language || "es"
                  const confirms: any = { fr: "C'est fait.", ar: "تم بنجاح.", darija: "Safé, t9ada.", es: "Hecho." }
                  content += `\n\n${confirms[lang] || confirms.es}`
                } else {
                  content += `\n\n${toolResult}`
                }
                content = content.replace(/ACTION:\s*\w+\s*args:\s*{.*}/, "").trim()
              }
            }
          }

          // 2. Stream the final human content WORD BY WORD for a natural feel
          const words = content.split(' ')
          for (const word of words) {
            controller.enqueue(encoder.encode(word + ' '))
            // Small delay to simulate typing
            await new Promise(r => setTimeout(r, 40))
          }
          controller.close()
        } catch (e) {
          controller.error(e)
        }
      }
    })

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    })

  } catch (error: any) {
    console.error("DEBUG Chat Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
