"use client"

export function LoadingScreen() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center bg-transparent">
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex h-24 w-24 items-center justify-center">
          {/* Anillo exterior palpitante */}
          <div className="absolute inset-0 animate-ping rounded-full ring-4 ring-orange-500/20" />
          
          {/* Rueda giratoria luminosa en naranja */}
          <div className="absolute inset-0 animate-spin rounded-full border-y-4 border-l-4 border-orange-500 border-r-4 border-r-transparent opacity-90 shadow-[0_0_15px_rgba(234,88,12,0.5)]" />
          
          {/* Logo/Icono central en forma estática tipo corporativo */}
          <div className="h-14 w-14 overflow-hidden rounded-lg shadow-md relative z-10 bg-slate-900 border border-orange-500/30 flex items-center justify-center">
            {/* Centered text as logo placeholder */}
            <span className="text-orange-500 font-bold text-[11px] tracking-widest relative z-20">ALT</span>
          </div>
        </div>
        
        {/* Texto elegante */}
        <p className="animate-pulse text-sm font-semibold tracking-widest text-slate-500 dark:text-slate-400">
          CHARGEMENT...
        </p>
      </div>
    </div>
  )
}
