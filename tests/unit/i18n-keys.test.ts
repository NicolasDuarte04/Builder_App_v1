import en from '@/locales/en/common.json';
import es from '@/locales/es/common.json';

function collectKeys(obj: any, prefix = ''): Set<string> {
  const keys = new Set<string>();
  const stack: Array<{ node: any; path: string }> = [{ node: obj, path: prefix }];
  while (stack.length) {
    const { node, path } = stack.pop()!;
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      for (const k of Object.keys(node)) {
        const nextPath = path ? `${path}.${k}` : k;
        const value = node[k];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          stack.push({ node: value, path: nextPath });
        } else {
          keys.add(nextPath);
        }
      }
    }
  }
  return keys;
}

describe('i18n key parity (en vs es)', () => {
  it('both locales expose identical leaf key sets', () => {
    const enKeys = collectKeys(en);
    const esKeys = collectKeys(es);

    const missingInEs = [...enKeys].filter(k => !esKeys.has(k));
    const missingInEn = [...esKeys].filter(k => !enKeys.has(k));

    const hint = [
      missingInEs.length ? `Missing in es: ${missingInEs.slice(0, 20).join(', ')}${missingInEs.length > 20 ? '…' : ''}` : '',
      missingInEn.length ? `Missing in en: ${missingInEn.slice(0, 20).join(', ')}${missingInEn.length > 20 ? '…' : ''}` : ''
    ].filter(Boolean).join('\n');

    expect({ esHasAllEn: missingInEs.length, enHasAllEs: missingInEn.length }, hint).toEqual({ esHasAllEn: 0, enHasAllEs: 0 });
  });
});


