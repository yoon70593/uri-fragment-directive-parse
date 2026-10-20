# URI Fragment Directive Parse

Parses and normalises W3C text fragment directives (the `#:~:text=` scroll-to-text syntax) from URL hashes.

## Usage

```js
import {
  extractFragmentDirective,
  parseFragmentDirective,
  normalizeTextDirective,
  buildFragmentDirective,
} from 'uri-fragment-directive-parse';

// Split a hash into its element-id fragment and its directive string.
extractFragmentDirective('#heading:~:text=hello');
// => { fragment: 'heading', directive: 'text=hello' }

// Parse the directive portion (everything after `:~:`) into a start/end pair.
parseFragmentDirective('text=hello%20world,foo');
// => { start: 'hello world', end: 'foo' }

// Normalise a { start, end } object back into a `text=...` string.
normalizeTextDirective({ start: 'hello world', end: 'foo' });
// => 'text=hello%20world,foo'

// Build a full hash, optionally preserving an element-id fragment.
buildFragmentDirective({ start: 'foo' }, 'section');
// => '#section:~:text=foo'
```

## Why this exists

Browsers implement the fragment directive natively, but server-side rendering,
link previewers, and analytics pipelines often need to inspect or rewrite these
directives without a DOM. This library gives you a small, dependency-free parser
and normaliser that matches the encoding rules browsers emit.

The trade-off: only the `text=` directive is supported. The spec also defines
element-id directives, but those are just regular element fragments and do not
need special handling here. If multiple `text=` directives appear in one hash,
only the first is parsed — emitting multiple text directives in a single URL is
valid per spec but rarely intentional, and supporting it would complicate the
return type for no real gain.

## Edge cases you will hit

- **Malformed percent-escapes** (`text=foo%2`) cause `parseFragmentDirective` to
  return `null` rather than throwing. A partial decode would produce a directive
  browsers reject, so it is treated as absent.
- **Empty start anchor** is rejected by `normalizeTextDirective` (returns `null`)
  because the spec requires a start piece.
- **Empty end anchor** collapses to a single-piece directive: `text=foo,` becomes
  `text=foo`.
- **Whitespace** around `start` and `end` is trimmed on normalisation, since
  browsers match exact text and accidental surrounding spaces are almost never
  what the author meant.

## API

- `extractFragmentDirective(hash: string): { fragment: string, directive: string }`
- `parseFragmentDirective(directive: string): { start: string, end: string | null } | null`
- `normalizeTextDirective(parts: { start: string, end?: string | null }): string | null`
- `buildFragmentDirective(parts: { start: string, end?: string | null }, elementFragment?: string): string | null`

## Performance

The window keeps a bounded buffer, so `push` is constant time and memory does not
grow with the length of the stream. `peak` and `trough` are linear in the window
size, which is the trade that keeps `push` cheap.

## Limitations

Values are coerced to floats, so very large integers lose precision. If you need
exact integer aggregates over a window, this is the wrong tool.

