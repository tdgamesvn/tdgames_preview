interface Props {
  params: Promise<{ token: string }>
}

export default async function SharePage({ params }: Props) {
  const { token } = await params
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Shared Preview</h1>
      <p className="text-gray-500 mt-2">Token: {token} — coming in P4.</p>
    </main>
  )
}
