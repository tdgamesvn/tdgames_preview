import { createClient } from '@/lib/supabase/server'
import { ClientForm } from '@/components/dashboard/client-form'
import { Button } from '@/components/ui/button'
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
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <ClientForm mode="create" />
      </div>

      {!clients?.length ? (
        <p className="text-gray-500">
          No clients yet. Add your first client above.
        </p>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y">
          {clients.map((client) => (
            <div
              key={client.id}
              className="flex items-center justify-between px-6 py-4"
            >
              <Link
                href={`/dashboard/clients/${client.id}`}
                className="font-medium hover:underline"
              >
                {client.name}
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">/{client.slug}</span>
                <ClientForm
                  mode="edit"
                  client={client}
                  trigger={
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  }
                />
                <form
                  action={async () => {
                    'use server'
                    await deleteClient(client.id)
                  }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
