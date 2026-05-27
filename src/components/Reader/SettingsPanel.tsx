import type { ReaderTheme } from '../../types'
import {
  LineSpacingLooseIcon,
  LineSpacingNormalIcon,
  LineSpacingTightIcon,
} from './ReaderIcons'

interface ReaderSettingsPanelProps {
  open: boolean
  onClose: () => void
  fontSize: number
  fontFamily: string
  readerTheme: ReaderTheme
  lineSpacing: number
  onChange: (settings: {
    fontSize?: number
    fontFamily?: string
    theme?: ReaderTheme
    lineSpacing?: number
  }) => void
}

const fonts = [
  { label: 'Original', value: 'original' },
  { label: 'Serif', value: 'Palatino Linotype, Palatino, serif' },
  { label: 'Sans', value: '-apple-system, BlinkMacSystemFont, sans-serif' },
]

const themes: { id: ReaderTheme; bg: string; text: string; ring?: string }[] = [
  { id: 'light', bg: '#ffffff', text: '#1c1c1e' },
  { id: 'sepia', bg: '#f4ecd8', text: '#5b4636' },
  { id: 'dark', bg: '#1c1c1e', text: '#f2f2f7', ring: '#3a3a3c' },
]

const spacingPresets = [
  { value: 1.35, icon: LineSpacingTightIcon, label: 'Tight' },
  { value: 1.5, icon: LineSpacingNormalIcon, label: 'Default' },
  { value: 1.85, icon: LineSpacingLooseIcon, label: 'Loose' },
]

const segmentedTrackClass = 'flex rounded-lg bg-libro-bg p-1'

function segmentedButtonClass(active: boolean) {
  return `flex-1 rounded-md py-2 text-[13px] font-medium transition ${
    active
      ? 'bg-libro-surface text-libro-text shadow-sm'
      : 'text-libro-muted hover:text-libro-text'
  }`
}

export function ReaderSettingsPanel({
  open,
  onClose,
  fontSize,
  fontFamily,
  readerTheme,
  lineSpacing,
  onChange,
}: ReaderSettingsPanelProps) {
  if (!open) return null

  const activeFontFamily =
    fontFamily === 'Georgia, serif' ? 'original' : fontFamily

  const closestSpacing =
    spacingPresets.reduce((prev, curr) =>
      Math.abs(curr.value - lineSpacing) < Math.abs(prev.value - lineSpacing) ? curr : prev,
    )

  return (
    <div
      className="absolute inset-0 z-[60] flex items-end bg-black/25"
      onClick={onClose}
    >
      <div
        className="max-h-[min(520px,58vh)] w-full overflow-y-auto rounded-t-2xl border-t border-libro-border bg-libro-surface px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-2 text-libro-text shadow-[0_-8px_32px_rgba(0,0,0,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 mt-1 h-1 w-9 rounded-full bg-libro-border" />

        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-libro-text">Appearance</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[15px] font-medium text-libro-muted transition hover:bg-black/5 hover:text-libro-text"
          >
            Done
          </button>
        </div>

        <section className="mb-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-libro-muted">
            Theme
          </p>
          <div className="flex items-center justify-center gap-5">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-label={`${t.id} theme`}
                onClick={() => onChange({ theme: t.id })}
                className={`relative flex h-10 w-10 items-center justify-center rounded-full transition ${
                  readerTheme === t.id
                    ? 'ring-2 ring-libro-accent ring-offset-2 ring-offset-libro-surface'
                    : ''
                }`}
                style={{
                  background: t.bg,
                  color: t.text,
                  boxShadow: t.ring ? `inset 0 0 0 1px ${t.ring}` : 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                }}
              >
                <span className="text-[13px] font-semibold leading-none">Aa</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-libro-muted">
            Text size
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Decrease text size"
              onClick={() => onChange({ fontSize: Math.max(80, fontSize - 5) })}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-libro-bg text-[15px] font-medium text-libro-text transition hover:bg-black/[0.04]"
            >
              A
            </button>
            <input
              type="range"
              min={80}
              max={180}
              step={5}
              value={fontSize}
              onChange={(event) => onChange({ fontSize: parseInt(event.target.value, 10) })}
              className="libro-slider h-7 flex-1 cursor-pointer appearance-none bg-transparent"
              aria-label="Text size"
            />
            <button
              type="button"
              aria-label="Increase text size"
              onClick={() => onChange({ fontSize: Math.min(180, fontSize + 5) })}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-libro-bg text-[22px] font-medium leading-none text-libro-text transition hover:bg-black/[0.04]"
            >
              A
            </button>
          </div>
        </section>

        <section className="mb-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-libro-muted">
            Font
          </p>
          <div className={segmentedTrackClass}>
            {fonts.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => onChange({ fontFamily: f.value })}
                className={segmentedButtonClass(activeFontFamily === f.value)}
                style={
                  activeFontFamily === f.value && f.value !== 'original'
                    ? { fontFamily: f.value }
                    : undefined
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-libro-muted">
            Line spacing
          </p>
          <div className={segmentedTrackClass}>
            {spacingPresets.map((preset) => {
              const Icon = preset.icon
              const active = closestSpacing.value === preset.value
              return (
                <button
                  key={preset.value}
                  type="button"
                  aria-label={preset.label}
                  onClick={() => onChange({ lineSpacing: preset.value })}
                  className={`${segmentedButtonClass(active)} flex items-center justify-center py-2.5`}
                >
                  <Icon className={active ? 'text-libro-text' : 'text-libro-muted'} />
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
