export const now = () => (typeof performance !== 'undefined' && (performance as any).now) ? (performance as any).now() : Date.now();
export const since = (t0: number) => Math.max(0, Math.round(now() - t0));


