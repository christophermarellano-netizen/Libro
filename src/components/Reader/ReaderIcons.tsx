interface IconProps {
  className?: string
  strokeWidth?: number
}

export function ChevronLeftIcon({ className = 'h-[22px] w-[22px]', strokeWidth = 2 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M14.5 6.5L9 12l5.5 5.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SearchIcon({ className = 'h-[22px] w-[22px]', strokeWidth = 1.75 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth={strokeWidth} />
      <path
        d="M16.5 16.5L20 20"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ListBulletIcon({ className = 'h-[22px] w-[22px]', strokeWidth = 1.75 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M8 6h12" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M8 12h12" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M8 18h12" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="4.5" cy="6" r="1.1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1.1" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1.1" fill="currentColor" />
    </svg>
  )
}

export function BookmarkIcon({
  className = 'h-[22px] w-[22px]',
  strokeWidth = 1.75,
  filled = false,
}: IconProps & { filled?: boolean }) {
  if (filled) {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path
          d="M7 4.5h10a1 1 0 0 1 1 1v14.2a.6.6 0 0 1-.92.506L12 17.2l-5.08 2.996A.6.6 0 0 1 6 19.7V5.5a1 1 0 0 1 1-1Z"
          fill="currentColor"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M7 4.5h10a1 1 0 0 1 1 1v14.2a.6.6 0 0 1-.92.506L12 17.2l-5.08 2.996A.6.6 0 0 1 6 19.7V5.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TextFormatIcon({ className = 'h-[22px] w-[22px]', strokeWidth = 1.75 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M8 5.5h8" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M12 5.5V18.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M7.5 18.5h9" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}

export function ClockIcon({ className = 'h-[22px] w-[22px]', strokeWidth = 1.75 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth={strokeWidth} />
      <path
        d="M12 8.25V12l2.75 2.75"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SunIcon({ className = 'h-[22px] w-[22px]', strokeWidth = 1.75 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth={strokeWidth} />
      <path
        d="M12 3.5v1.75M12 18.75V20.5M4.5 12H2.75M21.25 12H19.5M6.04 6.04l1.24 1.24M16.72 16.72l1.24 1.24M17.96 6.04l-1.24 1.24M6.96 17.96l-1.24 1.24"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Apple Books reader menu trigger (three lines). */
export function BooksMenuIcon({ className = 'h-[22px] w-[22px]', strokeWidth = 1.85 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5.5 8h13" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M5.5 12h13" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M5.5 16h13" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}

/** Apple Books "Themes & Settings" Aa icon. */
export function AppleAaIcon({ className = 'h-[22px] w-[22px]' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <text
        x="4"
        y="17"
        fill="currentColor"
        fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
        fontSize="15"
        fontWeight="600"
      >
        A
      </text>
      <text
        x="14.5"
        y="17"
        fill="currentColor"
        fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
        fontSize="11"
        fontWeight="600"
      >
        a
      </text>
    </svg>
  )
}

export function ShareIcon({ className = 'h-[22px] w-[22px]', strokeWidth = 1.75 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 4.5v10"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M8.5 7.5 12 4l3.5 3.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 13.5h10a2 2 0 0 1 2 2V18.5H5v-3a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function OrientationLockIcon({ className = 'h-[22px] w-[22px]', strokeWidth = 1.75 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 5.5a6.5 6.5 0 1 1-4.6 11.1"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M8.5 8.5V6.75a1.25 1.25 0 0 1 2.15-.87l4.35 4.35"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="10.25"
        y="11.25"
        width="5.5"
        height="7"
        rx="1.1"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
    </svg>
  )
}

export function LayoutOptionsIcon({ className = 'h-[22px] w-[22px]', strokeWidth = 1.75 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M6.5 7.5h11" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M6.5 12h7.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M6.5 16.5h9.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}

export function TranslateIcon({ className = 'h-[22px] w-[22px]', strokeWidth = 1.75 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M6.5 7.5h7M10 7.5V16.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M7.5 16.5h5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M14.5 10.5h5M17 10.5V16.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M15.5 16.5h3"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function LineSpacingTightIcon({ className = 'h-[18px] w-[18px]' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function LineSpacingNormalIcon({ className = 'h-[18px] w-[18px]' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5 6h14M5 12h14M5 18h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function LineSpacingLooseIcon({ className = 'h-[18px] w-[18px]' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5 5h14M5 12h14M5 19h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}
