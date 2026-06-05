export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Portal nav will be added in P4 */}
      {children}
    </div>
  )
}
