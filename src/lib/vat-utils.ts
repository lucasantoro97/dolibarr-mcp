// Ported from aruba-bridge DolibarrClient.ts lines 122-191

export function normalizeVat(vat: string | undefined): string {
  return String(vat ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function numericVatPart(vat: string): string {
  return vat.replace(/^[A-Z]{2}/, '');
}

function stripLeadingZeros(value: string): string {
  const stripped = value.replace(/^0+/, '');
  return stripped || '0';
}

export function buildVatLookupTokens(rawVat: string): string[] {
  const normalized = normalizeForCompare(rawVat);
  if (!normalized) return [];

  const tokens = new Set<string>();
  tokens.add(normalized);

  const hasCountryPrefix = /^[A-Z]{2}/.test(normalized);
  const numeric = numericVatPart(normalized);
  if (numeric) {
    const numericOnly = numeric.replace(/[^0-9]/g, '');
    tokens.add(numeric);
    tokens.add(stripLeadingZeros(numeric));
    if (numericOnly) {
      tokens.add(numericOnly);
      tokens.add(stripLeadingZeros(numericOnly));
    }
    if (hasCountryPrefix) {
      const prefix = normalized.slice(0, 2);
      tokens.add(`${prefix}${stripLeadingZeros(numeric)}`);
      if (numericOnly) {
        tokens.add(`${prefix}${stripLeadingZeros(numericOnly)}`);
      }
    } else if (/^\d{8,11}$/.test(numericOnly)) {
      const padded = numericOnly.padStart(11, '0').slice(-11);
      tokens.add(`IT${padded}`);
      tokens.add(`IT${stripLeadingZeros(padded)}`);
    }
  }

  return [...tokens].filter(Boolean);
}

export function vatEquivalent(left: string | undefined, right: string | undefined): boolean {
  const leftTokens = new Set(buildVatLookupTokens(String(left ?? '')));
  if (!leftTokens.size) return false;
  const rightTokens = buildVatLookupTokens(String(right ?? ''));
  if (!rightTokens.length) return false;
  return rightTokens.some((token) => leftTokens.has(token));
}

export function normalizeForCompare(value: unknown): string {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function escapeSqlFilterValue(value: string): string {
  return value.replace(/'/g, "''");
}
