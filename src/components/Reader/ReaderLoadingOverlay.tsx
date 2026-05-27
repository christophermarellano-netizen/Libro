interface ReaderLoadingOverlayProps {
  progress: number
  label?: string
}

export function ReaderLoadingOverlay({ progress, label = 'Opening book…' }: ReaderLoadingOverlayProps) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, progress))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-libro-bg/95">
      <div className="relative">
        <svg
          width="96"
          height="96"
          viewBox="0 0 96 96"
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-libro-border"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-libro-accent transition-[stroke-dashoffset] duration-300 ease-out"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium tabular-nums text-libro-text">
          {Math.round(clamped)}%
        </span>
      </div>
      <p className="text-sm text-libro-muted">{label}</p>
    </div>
  )
}
