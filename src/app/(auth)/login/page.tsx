import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <>
      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .fu1 { animation: fade-up 0.6s ease forwards 0.05s; opacity: 0; }
        .fu2 { animation: fade-up 0.6s ease forwards 0.18s; opacity: 0; }
        .fu3 { animation: fade-up 0.6s ease forwards 0.32s; opacity: 0; }
        .fu4 { animation: fade-up 0.6s ease forwards 0.46s; opacity: 0; }
        .fu5 { animation: fade-up 0.6s ease forwards 0.60s; opacity: 0; }
        .amber-pulse { animation: pulse-glow 3s ease-in-out infinite; }
        .dark-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 14px;
          color: #F2F2F2;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          font-family: inherit;
        }
        .dark-input::placeholder { color: rgba(157,156,157,0.5); }
        .dark-input:focus {
          border-color: #FF9500;
          background: rgba(255,149,0,0.05);
          box-shadow: 0 0 0 3px rgba(255,149,0,0.12), 0 0 20px rgba(255,149,0,0.08);
        }
        .dark-input:autofill, .dark-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px #141920 inset;
          -webkit-text-fill-color: #F2F2F2;
        }
        .amber-btn {
          width: 100%;
          padding: 12px;
          background: #FF9500;
          color: #0F0F0F;
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s;
          font-family: inherit;
          disabled:opacity: 0.45;
        }
        .amber-btn:hover:not(:disabled) {
          background: #FF6B00;
          box-shadow: 0 0 28px rgba(255,149,0,0.4);
        }
        .amber-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .form-label {
          display: block;
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          font-weight: 800;
          color: #9D9C9D;
          margin-bottom: 7px;
        }
        .form-error {
          font-size: 13px;
          color: #F44336;
          padding: 10px 12px;
          background: rgba(244,67,54,0.08);
          border: 1px solid rgba(244,67,54,0.2);
          border-radius: 12px;
        }
      `}</style>

      <main
        style={{
          minHeight: '100vh',
          background: '#050a14',
          display: 'flex',
        }}
      >
        {/* ── Left form panel ── */}
        <div style={{
          width: '100%',
          maxWidth: 460,
          minWidth: 320,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 40px',
          position: 'relative',
          background: 'linear-gradient(160deg, #0e1520 0%, #080c14 55%, #060810 100%)',
          borderRight: '1px solid rgba(255,149,0,0.08)',
          overflow: 'hidden',
        }}>
          {/* Ambient radial glow — top center */}
          <div style={{
            position: 'absolute', top: -80, left: '50%',
            transform: 'translateX(-50%)',
            width: 360, height: 280,
            background: 'radial-gradient(ellipse at center, rgba(255,149,0,0.13) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Ambient radial glow — bottom right */}
          <div style={{
            position: 'absolute', bottom: -60, right: -40,
            width: 240, height: 200,
            background: 'radial-gradient(ellipse at center, rgba(255,149,0,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Top amber accent line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,149,0,0.6) 40%, rgba(255,107,0,0.8) 60%, transparent 100%)',
          }} />
          {/* Top amber glow blur */}
          <div style={{
            position: 'absolute', top: 0, left: '20%', right: '20%',
            height: 40,
            background: 'linear-gradient(180deg, rgba(255,149,0,0.12) 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />

          {/* Corner brackets */}
          {/* Top-left */}
          <div style={{ position: 'absolute', top: 20, left: 20, width: 18, height: 18,
            borderTop: '1px solid rgba(255,149,0,0.4)', borderLeft: '1px solid rgba(255,149,0,0.4)' }} />
          {/* Top-right */}
          <div style={{ position: 'absolute', top: 20, right: 20, width: 18, height: 18,
            borderTop: '1px solid rgba(255,149,0,0.2)', borderRight: '1px solid rgba(255,149,0,0.2)' }} />
          {/* Bottom-left */}
          <div style={{ position: 'absolute', bottom: 20, left: 20, width: 18, height: 18,
            borderBottom: '1px solid rgba(255,149,0,0.2)', borderLeft: '1px solid rgba(255,149,0,0.2)' }} />
          {/* Bottom-right */}
          <div style={{ position: 'absolute', bottom: 20, right: 20, width: 18, height: 18,
            borderBottom: '1px solid rgba(255,149,0,0.1)', borderRight: '1px solid rgba(255,149,0,0.1)' }} />

          {/* Subtle vertical rule — decorative left edge */}
          <div style={{
            position: 'absolute', top: '15%', bottom: '15%', left: 0,
            width: 1,
            background: 'linear-gradient(180deg, transparent, rgba(255,149,0,0.15) 40%, rgba(255,149,0,0.15) 60%, transparent)',
          }} />

          {/* Form content */}
          <div style={{ width: '100%', maxWidth: 340, position: 'relative' }}>
            {/* Header */}
            <div className="fu1" style={{ marginBottom: 36 }}>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="TDGame Studio" style={{ width: 34, height: 34, objectFit: 'contain' }} />
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,149,0,0.65)',
                }}>TDGame Studio</span>
              </div>
              <div style={{
                fontSize: 28,
                fontWeight: 900,
                color: '#F0F0F0',
                letterSpacing: '-0.015em',
                lineHeight: 1.2,
                marginBottom: 8,
              }}>
                Welcome back
              </div>
              <div style={{
                fontSize: 13,
                color: 'rgba(180,180,185,0.5)',
                letterSpacing: '0.01em',
              }}>
                Sign in to access your deliverables
              </div>
            </div>

            {/* Divider */}
            <div className="fu2" style={{
              marginBottom: 28,
              height: 1,
              background: 'linear-gradient(90deg, rgba(255,149,0,0.25) 0%, rgba(255,255,255,0.05) 100%)',
            }} />

            {/* Login form */}
            <div className="fu3">
              <LoginForm />
            </div>
          </div>

          {/* Bottom hint */}
          <div style={{
            position: 'absolute', bottom: 24,
            fontSize: 9,
            color: 'rgba(157,156,157,0.2)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            Confidential · Authorized Access Only
          </div>
        </div>

        {/* ── Right video panel ── */}
        <div
          className="hidden lg:block"
          style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000' }}
        >
          {/* Looping background video */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          >
            <source
              src="https://cdn.tdgamestudio.com/projects/2026/05/eb574720-923c-4ad0-abe3-c45320b9359a-final_loop_7s.mp4"
              type="video/mp4"
            />
          </video>

          {/* Black overlay 65% */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#000',
              opacity: 0.65,
            }}
          />
        </div>
      </main>
    </>
  )
}
