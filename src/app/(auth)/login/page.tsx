import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <>
      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fu1 { animation: fade-up 0.5s ease forwards 0.05s; opacity: 0; }
        .fu2 { animation: fade-up 0.5s ease forwards 0.15s; opacity: 0; }
        .fu3 { animation: fade-up 0.5s ease forwards 0.28s; opacity: 0; }
        .fu4 { animation: fade-up 0.5s ease forwards 0.42s; opacity: 0; }
        .fu5 { animation: fade-up 0.5s ease forwards 0.55s; opacity: 0; }
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
          background: '#0d1117',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 40px',
          position: 'relative',
        }}>
          {/* Top primary line */}
          <div style={{
            position: 'absolute', top: 0, left: 40, right: 40,
            height: 2,
            background: 'linear-gradient(90deg, transparent, #FF9500 40%, #FF6B00 60%, transparent)',
          }} />

          {/* Form content */}
          <div style={{ width: '100%', maxWidth: 340 }}>
            {/* Header */}
            <div className="fu1" style={{ marginBottom: 36 }}>
              <div style={{ marginBottom: 14 }}>
                <img src="/logo.png" alt="TDGame Studio" style={{ width: 36, height: 36, objectFit: 'contain' }} />
              </div>
              <div style={{
                fontSize: 30,
                fontWeight: 900,
                color: '#F2F2F2',
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
                marginBottom: 6,
              }}>
                Welcome back
              </div>
              <div style={{
                fontSize: 14,
                color: 'rgba(157,156,157,0.6)',
              }}>
                Sign in to access your deliverables
              </div>
            </div>

            {/* Login form */}
            <LoginForm />
          </div>

          {/* Bottom hint */}
          <div style={{
            position: 'absolute', bottom: 28,
            fontSize: 9,
            color: 'rgba(157,156,157,0.25)',
            letterSpacing: '0.1em',
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

          {/* Black overlay 30% */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#000',
              opacity: 0.3,
            }}
          />
        </div>
      </main>
    </>
  )
}
