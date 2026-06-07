interface SectionHeaderProps {
  label: string
  count?: number
  action?: React.ReactNode
}

export function SectionHeader({ label, count, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: '#FF9500' }}
        >
          {label}
        </span>
        {count !== undefined && (
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#555' }}
          >
            {count}
          </span>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
