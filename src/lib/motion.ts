/**
 * PickleSpace Motion Tokens
 * Only use motion to guide attention, communicate state, or preserve continuity.
 * If it does none of those → remove it.
 */

export const spring = {
  smooth:  { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  fast:    { duration: 0.18, ease: [0.4, 0, 0.2, 1]   as [number, number, number, number] },
  snappy:  { type: 'spring' as const, stiffness: 400, damping: 30 },
}

export const distance = { sm: 8, md: 16, lg: 24 }

/** Stagger container variant — for lists of cards */
export const staggerContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.05 } },
}

/** Stagger item variant — fade + lift */
export const staggerItem = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: spring.smooth },
}

/** Sheet slide-up */
export const slideUp = {
  hidden:  { y: '100%', opacity: 0 },
  visible: { y: 0, opacity: 1, transition: spring.snappy },
  exit:    { y: '100%', opacity: 0, transition: spring.fast },
}

/** Shake — for error states */
export const shake = {
  animate: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.45, ease: 'easeInOut' as const },
  },
}
