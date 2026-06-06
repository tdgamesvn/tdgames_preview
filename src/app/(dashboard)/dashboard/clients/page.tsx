import { createClient } from '@/lib/supabase/server'
import { ClientForm } from '@/components/dashboard/client-form'
import Link from 'next/link'
import { deleteClient } from '@/lib/actions/clients'
import type { PrvClient } from '@/lib/types/database'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = (await supabase
    .from('Prv_clients')
    .select('*')
    .order('name')) as { data: PrvClient[] | null }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-neutral-medium mb-1">
            Internal Dashboard
          </p>
          <h1 className="text-lg font-black uppercase tracking-wider text-white">
            Clients
          </h1>
        </div>
        <ClientForm mode="create" />
      </div>

      {/* Empty state */}
      {!clients?.length ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">👥</p>
          <p className="text-sm text-neutral-medium">No clients yet</p>
          <p className="text-xs mt-1 text-neutral-dark">
            Add your first client using the button above
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          {clients.map((client, i) => (
            <div
              key={client.id}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.025] transition-all"
              style={{
                borderBottom:
                  i < clients.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              {/* Name + slug */}
              <div>
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="text-sm font-semibold text-white hover:text-primary transition-colors"
                >
                  {client.name}
                </Link>
                <p className="text-[10px] font-mono tracking-wider text-neutral-medium mt-0.5">
                  /{client.slug}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <ClientForm
                  mode="edit"
                  client={client}
                  trigger={
                    <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-neutral-medium border border-white/10 hover:text-white hover:border-white/20 transition-all">
                      Edit
                    </button>
                  }
                />
                <form
                  action={async () => {
                    'use server'
                    await deleteClient(client.id)
                  }}
                >
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-neutral-medium border border-white/10 hover:text-status-error hover:border-red-500/20 transition-all"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
