"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

type FiscalModeContextType = {
  fiscalMode: boolean
  toggleFiscalMode: () => void
}

const FiscalModeContext = createContext<FiscalModeContextType | undefined>(undefined)

export function FiscalModeProvider({ children }: { children: React.ReactNode }) {
  const [fiscalMode, setFiscalMode] = useState<boolean>(false)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("fiscal_mode")
    if (saved === "true") {
      setFiscalMode(true)
      document.documentElement.classList.add("fiscal-mode")
    }
  }, [])

  const toggleFiscalMode = () => {
    setFiscalMode((prev) => {
      const next = !prev
      localStorage.setItem("fiscal_mode", String(next))
      if (next) {
        document.documentElement.classList.add("fiscal-mode")
      } else {
        document.documentElement.classList.remove("fiscal-mode")
      }
      return next
    })
  }

  return (
    <FiscalModeContext.Provider value={{ fiscalMode, toggleFiscalMode }}>
      {children}
    </FiscalModeContext.Provider>
  )
}

export function useFiscalMode() {
  const context = useContext(FiscalModeContext)
  if (context === undefined) {
    throw new Error("useFiscalMode must be used within a FiscalModeProvider")
  }
  return context
}
