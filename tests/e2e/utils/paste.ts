import { Page } from '@playwright/test';

export async function dispatchPaste(page: Page, selector: string, text: string) {
  await page.evaluate(({ selector, text }) => {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) throw new Error('paste target not found: ' + selector);
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const paste = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt as any });
    el.dispatchEvent(paste);
  }, { selector, text });
}


