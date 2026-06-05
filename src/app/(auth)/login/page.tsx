import { Rajdhani, JetBrains_Mono } from 'next/font/google'
import { LoginForm } from '@/components/auth/login-form'

const rajdhani = Rajdhani({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'] })

export default function LoginPage() {
  return (
    <>
      <style>{`
        @keyframes grid-pulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.55; }
        }
        @keyframes scan {
          0% { top: -2px; }
          100% { top: 100%; }
        }
        @keyframes diamond-spin {
          from { transform: rotate(45deg); }
          to { transform: rotate(405deg); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes amber-glow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .login-grid-bg {
          background-color: #030810;
          background-image:
            linear-gradient(rgba(245,158,11,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,158,11,0.07) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: grid-pulse 5s ease-in-out infinite;
        }
        .scanline {
          position: absolute;
          left: 0; right: 0;
          height: 120px;
          background: linear-gradient(to bottom, transparent, rgba(245,158,11,0.04), transparent);
          animation: scan 8s linear infinite;
          pointer-events: none;
        }
        .diamond-outer {
          width: 120px; height: 120px;
          border: 1px solid rgba(245,158,11,0.35);
          transform: rotate(45deg);
          position: relative;
          animation: diamond-spin 24s linear infinite;
        }
        .diamond-inner {
          position: absolute;
          inset: 20px;
          border: 1px solid rgba(245,158,11,0.15);
          background: rgba(245,158,11,0.05);
        }
        .fu1 { animation: fade-up 0.5s ease forwards 0.05s; opacity: 0; }
        .fu2 { animation: fade-up 0.5s ease forwards 0.15s; opacity: 0; }
        .fu3 { animation: fade-up 0.5s ease forwards 0.28s; opacity: 0; }
        .fu4 { animation: fade-up 0.5s ease forwards 0.42s; opacity: 0; }
        .fu5 { animation: fade-up 0.5s ease forwards 0.55s; opacity: 0; }
        .amber-dot { animation: amber-glow 2.5s ease-in-out infinite; }
        .dark-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          padding: 11px 14px;
          font-size: 14px;
          color: #f1f5f9;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          font-family: inherit;
        }
        .dark-input::placeholder { color: rgba(148,163,184,0.4); }
        .dark-input:focus {
          border-color: #f59e0b;
          background: rgba(245,158,11,0.05);
          box-shadow: 0 0 0 3px rgba(245,158,11,0.12), 0 0 20px rgba(245,158,11,0.08);
        }
        .dark-input:autofill, .dark-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px #141920 inset;
          -webkit-text-fill-color: #f1f5f9;
        }
        .amber-btn {
          width: 100%;
          padding: 12px;
          background: #f59e0b;
          color: #0a0a0f;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
          font-family: inherit;
        }
        .amber-btn:hover:not(:disabled) {
          background: #fbbf24;
          box-shadow: 0 0 28px rgba(245,158,11,0.45);
        }
        .amber-btn:active:not(:disabled) { transform: translateY(1px); }
        .amber-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .form-label {
          display: block;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(148,163,184,0.7);
          margin-bottom: 7px;
        }
        .form-error {
          font-size: 13px;
          color: #f87171;
          padding: 10px 12px;
          background: rgba(248,113,113,0.1);
          border: 1px solid rgba(248,113,113,0.2);
          border-radius: 6px;
        }
      `}</style>

      <main
        style={{
          minHeight: '100vh',
          background: '#050a14',
          display: 'flex',
          fontFamily: rajdhani.style.fontFamily,
        }}
      >
        {/* ── Left decorative panel ── */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            display: 'none',
          }}
          className="lg:block"
        >
          {/* Animated grid */}
          <div className="login-grid-bg" style={{ position: 'absolute', inset: 0 }} />
          <div className="scanline" />

          {/* Inner frame */}
          <div style={{
            position: 'absolute',
            top: 48, left: 48, right: 48, bottom: 48,
            border: '1px solid rgba(245,158,11,0.12)',
          }} />
          <div style={{
            position: 'absolute',
            top: 56, left: 56, right: 56, bottom: 56,
            border: '1px solid rgba(245,158,11,0.05)',
          }} />

          {/* Corner accent dots */}
          {[
            { top: 45, left: 45 }, { top: 45, right: 45 },
            { bottom: 45, left: 45 }, { bottom: 45, right: 45 },
          ].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute', ...pos,
              width: 6, height: 6,
              background: 'rgba(245,158,11,0.6)',
              borderRadius: 1,
            }} />
          ))}

          {/* Center content */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '80px 64px',
            textAlign: 'center',
          }}>
            {/* Animated diamond */}
            <div style={{ marginBottom: 52 }}>
              <div className="diamond-outer">
                <div className="diamond-inner" />
              </div>
            </div>

            <div style={{
              fontFamily: mono.style.fontFamily,
              fontSize: 10,
              letterSpacing: '0.35em',
              color: 'rgba(245,158,11,0.75)',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}>
              TDGAME STUDIO
            </div>

            <div style={{
              fontSize: 52,
              fontWeight: 700,
              color: '#f8fafc',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              marginBottom: 18,
            }}>
              Preview<br />Portal
            </div>

            <div style={{
              fontSize: 15,
              color: 'rgba(148,163,184,0.55)',
              lineHeight: 1.7,
              maxWidth: 260,
            }}>
              Secure access for reviewing<br />
              Art, Animation &amp; VFX deliverables
            </div>

            {/* Tags */}
            <div style={{
              display: 'flex', gap: 8, marginTop: 36,
              fontFamily: mono.style.fontFamily,
            }}>
              {['ART', 'ANIMATION', 'VFX'].map(tag => (
                <span key={tag} style={{
                  padding: '4px 10px',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: 3,
                  fontSize: 9,
                  letterSpacing: '0.2em',
                  color: 'rgba(245,158,11,0.6)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom status */}
          <div style={{
            position: 'absolute', bottom: 36, left: 64,
            fontFamily: mono.style.fontFamily,
            fontSize: 10,
            color: 'rgba(148,163,184,0.35)',
            letterSpacing: '0.1em',
            lineHeight: 2,
          }}>
            <div>SYS // PREVIEW-PORTAL-v1.0</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="amber-dot" style={{
                width: 5, height: 5,
                borderRadius: '50%',
                background: '#f59e0b',
                display: 'inline-block',
              }} />
              <span style={{ color: 'rgba(245,158,11,0.55)' }}>SECURE CONNECTION</span>
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
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
          {/* Top amber line */}
          <div style={{
            position: 'absolute', top: 0, left: 40, right: 40,
            height: 2,
            background: 'linear-gradient(90deg, transparent, #f59e0b 40%, #fbbf24 60%, transparent)',
          }} />

          {/* Form content */}
          <div style={{ width: '100%', maxWidth: 340 }}>
            {/* Header */}
            <div className="fu1" style={{ marginBottom: 36 }}>
              <div style={{
                fontFamily: mono.style.fontFamily,
                fontSize: 10,
                letterSpacing: '0.3em',
                color: 'rgba(245,158,11,0.8)',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}>
                TDGAME STUDIO
              </div>
              <div style={{
                fontSize: 30,
                fontWeight: 700,
                color: '#f8fafc',
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
                marginBottom: 6,
              }}>
                Welcome back
              </div>
              <div style={{
                fontSize: 14,
                color: 'rgba(148,163,184,0.55)',
              }}>
                Sign in to access your deliverables
              </div>
            </div>

            {/* Login form */}
            <LoginForm monoFont={mono.style.fontFamily} />
          </div>

          {/* Bottom */}
          <div style={{
            position: 'absolute', bottom: 28,
            fontFamily: mono.style.fontFamily,
            fontSize: 9,
            color: 'rgba(148,163,184,0.25)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Confidential · Authorized Access Only
          </div>
        </div>
      </main>
    </>
  )
}
