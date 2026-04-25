import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { FiscalModeProvider } from "@/providers/fiscal-mode-context"
import { AssistantChat } from "@/components/chat/assistant-chat"

import { Suspense } from "react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={null}>
      <FiscalModeProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <AppHeader />
            <main className="flex-1 p-6">{children}</main>
            <AssistantChat />
          </SidebarInset>
        </SidebarProvider>
      </FiscalModeProvider>
    </Suspense>
  )
}
