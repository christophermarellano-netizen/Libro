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
