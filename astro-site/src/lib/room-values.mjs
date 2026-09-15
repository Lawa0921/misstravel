/** Shared build-time room values. No browser runtime or expression evaluation. */
const rates = ['weekdayPrice', 'holidayPrice', 'standardPrice'];
const allowed = /^(?:weekdayPrice|holidayPrice|standardPrice|numberOfPeople|priceOptions\.\d+\.(?:weekdayPrice|holidayPrice|standardPrice|numberOfPeople|numberOfUnits))$/;

/** @param {unknown} value @param {string} label @param {number} minimum */
function integer(value, label, minimum = 0) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`Invalid room numeric value: ${label}`);
  }
  return value;
}

/** Only finite numeric fields on the allowlist may be interpolated.
 * @param {string} text @param {Record<string, any>} data @returns {string}
 */
export function resolveRoomValueTokens(text, data) {
  const result = text.replace(/\{\{([^{}]+)\}\}/g, (_, raw) => {
    const key = raw.trim();
    if (!allowed.test(key)) throw new Error(`Unsupported room value reference: ${key}`);
    let value = data;
    for (const part of key.split('.')) {
      if (value === null || typeof value !== 'object' || !Object.hasOwn(value, part)) {
        throw new Error(`Missing room value reference: ${key}`);
      }
      value = value[part];
    }
    return String(integer(value, key));
  });
  if (/\{\{|\}\}/.test(result)) throw new Error('Malformed or unresolved room value reference');
  return result;
}

/** Standard plan values derive from the root; alternatives own their differing values.
 * Idempotent so raw frontmatter and already-parsed collection data share one path.
 * @param {unknown} input @returns {Record<string, any>}
 */
export function normalizeRoomData(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid room frontmatter');
  const data = { ...input };
  for (const key of rates) integer(data[key], key);
  integer(data.numberOfPeople, 'numberOfPeople', 1);
  integer(data.numberOfRooms, 'numberOfRooms', 1);
  if (data.priceOptions !== undefined) {
    if (!Array.isArray(data.priceOptions) || data.priceOptions.length < 2) throw new Error('Room priceOptions require at least two plans');
    if (data.priceOptions.filter(option => option.isStandard === true).length !== 1) throw new Error('Room requires exactly one standard plan');
    data.priceOptions = data.priceOptions.map((option, index) => {
      if (!option || typeof option !== 'object' || Array.isArray(option)) throw new Error('Invalid room price option');
      const resolved = { ...option };
      if (option.isStandard === true) {
        for (const key of [...rates, 'numberOfPeople']) {
          if (option[key] !== undefined && option[key] !== data[key]) throw new Error(`Conflicting standard plan ${key}`);
          resolved[key] = data[key];
        }
      }
      for (const key of rates) integer(resolved[key], `priceOptions.${index}.${key}`);
      integer(resolved.numberOfPeople, `priceOptions.${index}.numberOfPeople`, 1);
      integer(resolved.numberOfUnits, `priceOptions.${index}.numberOfUnits`, 1);
      return resolved;
    });
  }
  for (const field of ['description', 'metaDescription']) {
    if (typeof data[field] !== 'string' || !data[field].trim()) throw new Error(`Missing ${field}`);
    data[field] = resolveRoomValueTokens(data[field], data);
  }
  return data;
}
