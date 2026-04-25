"use client"

import * as React from "react"
import { MessageSquare, Send, X, Bot, User, Loader2, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Message {
  role: "user" | "assistant"
  content: string
  image?: string // Base64 image
}

export function AssistantChat() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<Message[]>([
    { role: "assistant", content: "Bonjour ! Je suis votre assistant ALT Digital. Comment puis-je vous aider aujourd'hui ?" }
  ])
  const [input, setInput] = React.useState("")
  const [image, setImage] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight)
    }
  }, [messages])

  const handleSend = async () => {
    if ((!input.trim() && !image) || isLoading) return

    const userMessage: Message = { 
      role: "user", 
      content: input,
      image: image || undefined
    }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setImage(null)
    setIsLoading(true)

    try {
      // 1. Get Settings from localStorage
      const savedSettings = localStorage.getItem("ai_settings")
      const aiSettings = savedSettings ? JSON.parse(savedSettings) : { provider: "ollama" }
      
      const config = {
        provider: aiSettings.provider,
        apiKey: aiSettings.provider === "groq" ? aiSettings.groqKey : aiSettings.geminiKey,
        model: aiSettings.provider === "ollama" ? aiSettings.ollamaModel : undefined
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          settings: config
        })
      })

      if (!response.ok) throw new Error("Failed to send message")

      // STREAMING HANDLER
      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader")
      
      let assistantMessage = { role: "assistant" as const, content: "" }
      setMessages(prev => [...prev, assistantMessage])

      const decoder = new TextDecoder()
      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        fullContent += chunk
        
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...assistantMessage, content: fullContent }
          return updated
        })
      }

      // 2. Refresh after action (if needed)
      if (fullContent.includes("[SISTEMA]: Success")) {
        // We could trigger a global refresh or similar here
      }

    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "Lo siento, hubo un error al procesar tu solicitud. Revisa tu configuración de API en Ajustes." }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <Card className="mb-4 w-[350px] sm:w-[400px] h-[500px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-primary text-primary-foreground rounded-t-lg">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Asistente ALT Digital
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary-foreground/20" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 p-4 overflow-hidden">
            <ScrollArea className="h-full pr-4" ref={scrollRef}>
              <div className="flex flex-col gap-4">
                {messages.map((m, i) => (
                  <div key={i} className={cn("flex flex-col gap-1", m.role === "user" ? "items-end" : "items-start")}>
                    {m.image && (
                      <img src={m.image} alt="Upload" className="max-w-[200px] rounded-lg border mb-1" />
                    )}
                    <div className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Pensando...
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-4 pt-0 flex flex-col gap-2">
            {image && (
              <div className="relative w-16 h-16 mb-2">
                <img src={image} className="w-full h-full object-cover rounded-md border" />
                <button 
                  onClick={() => setImage(null)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <form className="flex w-full items-center space-x-2" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onloadend = () => setImage(reader.result as string)
                    reader.readAsDataURL(file)
                  }
                }}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
              <Input
                placeholder="Escribe o envía una foto..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading || (!input.trim() && !image)}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
      <Button
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    </div>
  )
}
