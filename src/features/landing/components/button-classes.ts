export const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
const buttonBase = `inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${focusRing}`

export const landingButtonClasses = {
  primary: `${buttonBase} bg-primary text-[var(--ink)] hover:bg-primary-hover`,
  ghost: `${buttonBase} border border-border text-text-primary hover:border-text-secondary`,
}
