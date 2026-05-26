import type { ReaderTheme } from '../../types'
import {
  LineSpacingLooseIcon,
  LineSpacingNormalIcon,
  LineSpacingTightIcon,
} from './ReaderIcons'

interface ReaderSettingsPanelProps {
  open: boolean
  theme: ReaderTheme
  onClose: () => void
  fontSize: number
  fontFamily: string
  readerTheme: ReaderTheme
  lineSpacing: number
  margin: number
  onChange: (settings: {
    fontSize?: number
    fontFamily?: string
    theme?: ReaderTheme
    lineSpacing?: number
    margin?: number
  }) => void
}

const fonts = [
  { label: 'Original', value: 'Georgia, serif' },
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

export function ReaderSettingsPanel({
  open,
  theme,
  onClose,
  fontSize,
  fontFamily,
  readerTheme,
  lineSpacing,
  margin,
  onChange,
}: ReaderSettingsPanelProps) {
  if (!open) return null

  const closestSpacing =
    spacingPresets.reduce((prev, curr) =>
      Math.abs(curr.value - lineSpacing) < Math.abs(prev.value - lineSpacing) ? curr : prev,
    )

  return (
    <div
      className="absolute inset-0 z-[60] flex items-end bg-black/25"
      onClick={onClose}
      data-reader-theme={theme}
    >
      <div
        className="reader-sheet max-h-[min(520px,58vh)] w-full overflow-y-auto rounded-t-[12px] px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reader-sheet-grabber mx-auto mb-5" />

        <section className="mb-6">
          <div className="flex items-center justify-center gap-5">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-label={`${t.id} theme`}
                onClick={() => onChange({ theme: t.id })}
                className={`relative flex h-9 w-9 items-center justify-center rounded-full transition ${
                  readerTheme === t.id ? 'ring-2 ring-[var(--reader-tint)] ring-offset-2 ring-offset-[var(--reader-sheet-bg)]' : ''
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Decrease text size"
              onClick={() => onChange({ fontSize: Math.max(80, fontSize - 5) })}
              className="reader-sheet-circle flex h-9 w-9 shrink-0 items-center justify-center text-[15px] font-medium"
            >
              A
            </button>
            <input
              type="range"
              min={80}
              max={180}
              step={5}
              value={fontSize}
              onChange={(e) => onChange({ fontSize: parseInt(e.target.value, 10) })}
              className="reader-sheet-slider flex-1"
              aria-label="Text size"
            />
            <button
              type="button"
              aria-label="Increase text size"
              onClick={() => onChange({ fontSize: Math.min(180, fontSize + 5) })}
              className="reader-sheet-circle flex h-9 w-9 shrink-0 items-center justify-center text-[22px] font-medium leading-none"
            >
              A
            </button>
          </div>
        </section>

        <section className="mb-6">
          <div className="reader-segmented flex p-0.5">
            {fonts.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => onChange({ fontFamily: f.value })}
                className={`flex-1 rounded-[7px] py-2 text-[13px] font-medium transition ${
                  fontFamily === f.value ? 'reader-segmented-active shadow-sm' : 'reader-chrome-subtitle'
                }`}
                style={fontFamily === f.value ? { fontFamily: f.value } : undefined}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <div className="reader-segmented flex p-0.5">
            {spacingPresets.map((preset) => {
              const Icon = preset.icon
              const active = closestSpacing.value === preset.value
              return (
                <button
                  key={preset.value}
                  type="button"
                  aria-label={preset.label}
                  onClick={() => onChange({ lineSpacing: preset.value })}
                  className={`flex flex-1 items-center justify-center rounded-[7px] py-2.5 transition ${
                    active ? 'reader-segmented-active shadow-sm' : 'reader-chrome-subtitle'
                  }`}
                >
                  <Icon />
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <span className="reader-chrome-subtitle text-[13px]">Margins</span>
            <span className="reader-chrome-subtitle text-[13px] tabular-nums">{margin}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={48}
            step={4}
            value={margin}
            onChange={(e) => onChange({ margin: parseInt(e.target.value, 10) })}
            className="reader-sheet-slider w-full"
            aria-label="Margins"
          />
        </section>
      </div>
    </div>
  )
}
