export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#080808' }}>

      {/* Grain texture overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
        }}
      />

      {/* Header — padding mirrors the main container */}
      <header
        className="relative z-10 flex items-center justify-between"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(8,8,8,0.97)',
          /* Responsive padding matches main content below */
          padding: 'clamp(10px, 2vw, 14px) clamp(20px, 5vw, 80px)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="TDGame Studio" className="w-7 h-7 object-contain flex-shrink-0" />
          <span
            className="font-black uppercase tracking-widest rounded"
            style={{
              fontSize: 'clamp(8px, 1vw, 10px)',
              letterSpacing: '0.14em',
              padding: '2px 7px',
              background: 'rgba(255,149,0,0.12)',
              color: '#FF9500',
              border: '1px solid rgba(255,149,0,0.2)',
            }}
          >
            Preview
          </span>
        </div>

        <span
          className="font-black uppercase tracking-widest rounded"
          style={{
            fontSize: 'clamp(8px, 1vw, 9px)',
            letterSpacing: '0.14em',
            padding: '3px 10px',
            background: 'rgba(33,150,243,0.08)',
            color: '#2196F3',
            border: '1px solid rgba(33,150,243,0.18)',
          }}
        >
          Public Preview
        </span>
      </header>

      {/*
        Main content container.
        max-w-[1440px]  — keeps content from stretching on ultrawide monitors
        px: clamp(20px → 80px) — generous breathing room on all screen sizes
        Matches header padding above for visual alignment.
      */}
      <main
        className="relative z-10 mx-auto w-full"
        style={{
          maxWidth: '1440px',
          padding: 'clamp(28px, 4vw, 56px) clamp(20px, 5vw, 80px)',
        }}
      >
        {children}
      </main>
    </div>
  )
}
