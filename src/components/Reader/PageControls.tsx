import type { ReaderTheme } from '../../types'

interface PageControlsProps {
  percentage: number
  theme: ReaderTheme
  onChange: (pct: number) => void
}

export function PageControls({ percentage, theme, onChange }: PageControlsProps) {
  return (
    <div
      className="px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-3"
      data-reader-theme={theme}
      style={{ ['--scrubber-fill' as string]: `${percentage}%` }}
    >
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={percentage}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label="Reading progress"
        className="reader-scrubber w-full"
      />
    </div>
  )
}
