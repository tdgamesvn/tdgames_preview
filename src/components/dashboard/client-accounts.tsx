'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Key, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  createClientAccount,
  updateClientAccountPassword,
  deleteClientAccount,
} from '@/lib/actions/client-accounts'

// ── Types ──────────────────────────────────────────────────────────────────
export interface ClientAccount {
  id: string
  email: string
  display_name: string
  created_at: string
}

interface Props {
  accounts: ClientAccount[]
  clientId: string
}

// ── Shared styled input ────────────────────────────────────────────────────
function DarkInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        padding: '9px 12px',
        fontSize: 14,
        color: '#F0F0F0',
        outline: 'none',
        transition: 'border-color 0.15s',
        ...props.style,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,149,0,0.5)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
    />
  )
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs font-medium"
      style={{
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.2)',
        color: '#EF4444',
      }}
    >
      {msg}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export function ClientAccountsSection({ accounts, clientId }: Props) {
  const router = useRouter()

  // Add Account
  const [addOpen,        setAddOpen]        = useState(false)
  const [addEmail,       setAddEmail]       = useState('')
  const [addName,        setAddName]        = useState('')
  const [addPassword,    setAddPassword]    = useState('')
  const [addError,       setAddError]       = useState<string | null>(null)
  const [addLoading,     setAddLoading]     = useState(false)

  // Change Password
  const [pwAccount,      setPwAccount]      = useState<ClientAccount | null>(null)
  const [newPassword,    setNewPassword]    = useState('')
  const [pwError,        setPwError]        = useState<string | null>(null)
  const [pwLoading,      setPwLoading]      = useState(false)

  // Delete
  const [delAccount,     setDelAccount]     = useState<ClientAccount | null>(null)
  const [delError,       setDelError]       = useState<string | null>(null)
  const [delLoading,     setDelLoading]     = useState(false)

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddLoading(true); setAddError(null)
    const result = await createClientAccount(clientId, addEmail, addPassword, addName)
    setAddLoading(false)
    if (result.error) { setAddError(result.error); return }
    setAddOpen(false)
    setAddEmail(''); setAddName(''); setAddPassword('')
    router.refresh()
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!pwAccount) return
    setPwLoading(true); setPwError(null)
    const result = await updateClientAccountPassword(pwAccount.id, newPassword, clientId)
    setPwLoading(false)
    if (result.error) { setPwError(result.error); return }
    setPwAccount(null); setNewPassword('')
    router.refresh()
  }

  async function handleDelete() {
    if (!delAccount) return
    setDelLoading(true); setDelError(null)
    const result = await deleteClientAccount(delAccount.id, clientId)
    setDelLoading(false)
    if (result.error) { setDelError(result.error); return }
    setDelAccount(null)
    router.refresh()
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: '#555' }}
        >
          Login Accounts
        </h2>
        <button
          onClick={() => { setAddOpen(true); setAddError(null) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: '#FF9500',
            color: '#080808',
            boxShadow: '0 1px 6px rgba(255,149,0,0.25)',
          }}
        >
          <Plus size={12} />
          Add Account
        </button>
      </div>

      {/* Account list / empty state */}
      {accounts.length === 0 ? (
        <div
          className="rounded-2xl px-4 py-8 text-center"
          style={{ border: '1px dashed rgba(255,255,255,0.08)' }}
        >
          <p className="text-xs" style={{ color: '#555' }}>No accounts yet</p>
          <p className="text-[10px] mt-0.5" style={{ color: '#3a3a3a' }}>
            Add a login account so this client can access the portal
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between rounded-xl px-4 py-3 gap-4"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#E0E0E0' }}>
                  {account.email}
                </p>
                {account.display_name && (
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: '#555' }}>
                    {account.display_name}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setPwAccount(account)
                    setNewPassword('')
                    setPwError(null)
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all hover:text-white hover:border-white/20"
                  style={{ color: '#666', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Key size={10} />
                  Change PW
                </button>
                <button
                  onClick={() => { setDelAccount(account); setDelError(null) }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all hover:text-status-error hover:border-red-500/20"
                  style={{ color: '#666', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Trash2 size={10} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Account Dialog ─────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Login Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <label
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: '#666' }}
              >
                Email
              </label>
              <DarkInput
                type="email"
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
                required
                placeholder="client@studio.com"
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: '#666' }}
              >
                Display Name <span style={{ color: '#444' }}>(optional)</span>
              </label>
              <DarkInput
                value={addName}
                onChange={e => setAddName(e.target.value)}
                placeholder="Studio Name"
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: '#666' }}
              >
                Password
              </label>
              <DarkInput
                type="password"
                value={addPassword}
                onChange={e => setAddPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min. 6 characters"
              />
            </div>

            {addError && <ErrorBanner msg={addError} />}

            <button
              type="submit"
              disabled={addLoading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                background: '#FF9500',
                color: '#080808',
                boxShadow: '0 1px 8px rgba(255,149,0,0.2)',
              }}
            >
              {addLoading ? 'Creating…' : 'Create Account'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Change Password Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={!!pwAccount}
        onOpenChange={open => { if (!open) setPwAccount(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          {pwAccount && (
            <form onSubmit={handleChangePassword} className="space-y-4 mt-1">
              <p className="text-xs" style={{ color: '#666' }}>
                Setting new password for{' '}
                <span style={{ color: '#E0E0E0' }}>{pwAccount.email}</span>
              </p>

              <div className="space-y-1.5">
                <label
                  className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: '#666' }}
                >
                  New Password
                </label>
                <DarkInput
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  autoFocus
                />
              </div>

              {pwError && <ErrorBanner msg={pwError} />}

              <button
                type="submit"
                disabled={pwLoading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{
                  background: '#FF9500',
                  color: '#080808',
                  boxShadow: '0 1px 8px rgba(255,149,0,0.2)',
                }}
              >
                {pwLoading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={!!delAccount}
        onOpenChange={open => { if (!open) setDelAccount(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
          </DialogHeader>
          {delAccount && (
            <div className="space-y-4 mt-1">
              <p className="text-sm" style={{ color: '#888' }}>
                Delete{' '}
                <span style={{ color: '#E0E0E0' }}>{delAccount.email}</span>?
                Their access to the portal will be revoked immediately.
              </p>

              {delError && <ErrorBanner msg={delError} />}

              <div className="flex gap-2">
                <button
                  onClick={() => setDelAccount(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    color: '#888',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={delLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    color: '#EF4444',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}
                >
                  {delLoading ? 'Deleting…' : 'Delete Account'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
