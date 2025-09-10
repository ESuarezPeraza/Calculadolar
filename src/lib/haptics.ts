
export const triggerHapticFeedback = (pattern: number | number[] = 50) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.error("Haptic feedback failed:", error);
    }
  }
};
