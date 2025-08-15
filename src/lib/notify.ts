export type NotifyPayload = { title: string; description?: string; variant?: 'default' | 'destructive' };

/**
 * Safe notifier: in the browser, tries to call the client toast; on the server, logs.
 */
export async function notify(payload: NotifyPayload) {
  if (typeof window === 'undefined') {
    console.info('[notify]', payload.title, payload.description ?? '');
    return;
  }
  try {
    const mod: any = await import('@/hooks/use-toast');
    if (typeof mod.toast === 'function') {
      mod.toast(payload);
    } else {
      console.info('[toast-fallback]', payload.title, payload.description ?? '');
    }
  } catch {
    console.info('[toast-missing]', payload.title, payload.description ?? '');
  }
}


