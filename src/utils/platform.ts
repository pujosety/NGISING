export function isAndroidOrNative(): boolean {
  if (typeof window === 'undefined') return false;
  const isCapacitor =
    window.location.protocol === 'capacitor:' ||
    Boolean(
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } })
        .Capacitor?.isNativePlatform?.()
    );
  if (isCapacitor) return true;

  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return true;

  return false;
}
