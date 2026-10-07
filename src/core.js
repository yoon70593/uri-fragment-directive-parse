/**
 * Parses and normalizes text fragment directives per the W3C
 * "Fragment Directive" specification (the scroll-to-text feature).
 *
 * Conventions chosen (stated plainly so callers know what to expect):
 *
 * 1. Only the `text=` directive is supported. The spec also defines
 *    element-id directives, but this library is focused on text fragments.
 *    If multiple text directives appear, only the first is returned from
 *    parseFragmentDirective; buildFragmentDirective always emits exactly one.
 *
 * 2. Percent-decoding uses `decodeURIComponent`. A malformed percent-escape
 *    (one that throws) is treated as a parse failure: normalizeTextDirective
 *    returns null rather than producing a directive that browsers would reject.
 *
 * 3. A "range" directive (start,end) is normalised so neither piece is empty.
 *    A single-piece directive is emitted without a trailing comma. We do not
 *    invent a suffix/prefix (`-` / `,` tokens) that the caller did not supply.
 */

/**
 * The fragment directive is the part of a URL's hash after the `~` separator,
 * and it never participates in element-id fragment resolution. This helper
 * splits a raw hash into { fragment, directive } so callers can handle both.
 *
 * Example: '#heading:~:text=foo' -> { fragment: 'heading', directive: 'text=foo' }
 *
 * @param {string} hash - the full hash including the leading '#', or '' if none.
 * @returns {{ fragment: string, directive: string }}
 */
export function extractFragmentDirective(hash) {
  if (typeof hash !== 'string') {
    return { fragment: '', directive: '' };
  }
  const stripped = hash.startsWith('#') ? hash.slice(1) : hash;
  const tilde = stripped.indexOf(':~:');
  if (tilde === -1) {
    // No directive marker; the whole stripped hash is the element fragment.
    return { fragment: stripped, directive: '' };
  }
  return {
    fragment: stripped.slice(0, tilde),
    directive: stripped.slice(tilde + 3),
  };
}

/**
 * Parse the fragment-directive portion (i.e. the text AFTER the `:~:` marker)
 * into the first `text=` directive found.
 *
 * Returns null when there is no valid text directive, or when a percent-escape
 * is malformed. We deliberately do not return a partial/best-effort object —
 * a malformed directive should be treated as absent so callers can fall back
 * to element-id scrolling.
 *
 * @param {string} directive - the directive string without the `:~:` prefix.
 * @returns {{ start: string, end: string|null } | null}
 */
export function parseFragmentDirective(directive) {
  if (typeof directive !== 'string' || directive.length === 0) {
    return null;
  }
  const pieces = directive.split('&');
  for (const piece of pieces) {
    if (!piece.startsWith('text=')) continue;
    const rawValue = piece.slice('text='.length);
    let decoded;
    try {
      decoded = decodeURIComponent(rawValue);
    } catch {
      // Malformed percent-escape. Treat the directive as absent rather than
      // returning garbage that a browser would reject.
      return null;
    }
    const commaIdx = decoded.indexOf(',');
    if (commaIdx === -1) {
      const start = decoded.trim();
      return start.length === 0 ? null : { start, end: null };
    }
    const start = decoded.slice(0, commaIdx).trim();
    const end = decoded.slice(commaIdx + 1).trim();
    if (start.length === 0 && end.length === 0) {
      return null;
    }
    return { start, end };
  }
  return null;
}

/**
 * Normalise a { start, end } pair into a canonical text directive value.
 *
 * Rules:
 *  - Whitespace around start/end is trimmed (browsers match exact text, so
 *    accidental surrounding spaces are almost never what the author meant).
 *  - An empty `start` with a non-empty `end` is rejected (null), because the
 *    spec requires a start anchor.
 *  - An empty `end` collapses to a single-piece directive.
 *  - Both pieces are percent-encoded with encodeURIComponent, which is safe
 *    for fragment-directive values and matches what browsers emit.
 *
 * @param {{ start: string, end?: string|null }} parts
 * @returns {string|null} the normalised `text=...` string, or null if invalid.
 */
export function normalizeTextDirective(parts) {
  if (!parts || typeof parts !== 'object') return null;
  const rawStart = typeof parts.start === 'string' ? parts.start : '';
  const rawEnd = typeof parts.end === 'string' ? parts.end : null;
  const start = rawStart.trim();
  const end = rawEnd === null ? null : rawEnd.trim();
  if (start.length === 0) {
    // A start anchor is mandatory per the spec.
    return null;
  }
  if (end !== null && end.length === 0) {
    // An empty end anchor is equivalent to a single-piece directive.
    return `text=${encodeURIComponent(start)}`;
  }
  if (end === null) {
    return `text=${encodeURIComponent(start)}`;
  }
  return `text=${encodeURIComponent(start)},${encodeURIComponent(end)}`;
}

/**
 * Build a complete fragment string (including the leading '#') from a
 * { start, end } pair. Returns null if the inputs do not normalise to a
 * valid directive.
 *
 * The optional `elementFragment` is prepended so callers can preserve an
 * element-id fragment alongside the directive, e.g. '#sec:~:text=foo'.
 *
 * @param {{ start: string, end?: string|null }} parts
 * @param {string} [elementFragment='']
 * @returns {string|null}
 */
export function buildFragmentDirective(parts, elementFragment = '') {
  const normalised = normalizeTextDirective(parts);
  if (normalised === null) return null;
  const frag = typeof elementFragment === 'string' ? elementFragment : '';
  if (frag.length === 0) {
    return `#:~:${normalised}`;
  }
  return `#${frag}:~:${normalised}`;
}
