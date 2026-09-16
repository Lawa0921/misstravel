/** Safe JSON text for an HTML script data block, without changing decoded values. */
export function safeInlineJson(value: unknown): string {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new TypeError('Cannot serialize undefined data');
  return serialized.replace(/</g, '\\u003c');
}
