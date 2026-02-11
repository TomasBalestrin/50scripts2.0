/**
 * Haptic feedback for mobile devices.
 * Uses navigator.vibrate API when available.
 */
const patterns = {
  light: [10],
  medium: [20],
  success: [10, 50, 10],
  error: [30, 50, 30],
  warning: [20, 30, 20],
} as const;

type HapticType = keyof typeof patterns;

export function haptic(type: HapticType = 'light'): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(patterns[type]);
  }
}
