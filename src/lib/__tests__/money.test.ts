import { parseCopMoney } from '../money';

describe('parseCopMoney', () => {
  test('parses dot separated COP', () => {
    expect(parseCopMoney('176.499.000')).toBe(176499000);
  });
  test('parses comma separated COP', () => {
    expect(parseCopMoney('176,499,000')).toBe(176499000);
  });
  test('parses space separated COP', () => {
    expect(parseCopMoney('176 499 000')).toBe(176499000);
  });
  test('drops decimals', () => {
    expect(parseCopMoney('176.499.000,00')).toBe(176499000);
    expect(parseCopMoney('176,499,000.50')).toBe(176499000);
  });
  test('returns null for invalid', () => {
    expect(parseCopMoney('abc')).toBeNull();
  });
});


