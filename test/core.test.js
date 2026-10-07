import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFragmentDirective,
  extractFragmentDirective,
  normalizeTextDirective,
  buildFragmentDirective,
} from '../src/core.js';

test('extractFragmentDirective splits element fragment and directive', () => {
  assert.deepEqual(
    extractFragmentDirective('#heading:~:text=foo'),
    { fragment: 'heading', directive: 'text=foo' },
  );
});

test('extractFragmentDirective handles directive-only hash', () => {
  assert.deepEqual(
    extractFragmentDirective('#:~:text=foo'),
    { fragment: '', directive: 'text=foo' },
  );
});

test('extractFragmentDirective handles hash with no directive', () => {
  assert.deepEqual(
    extractFragmentDirective('#section'),
    { fragment: 'section', directive: '' },
  );
});

test('extractFragmentDirective handles empty input', () => {
  assert.deepEqual(
    extractFragmentDirective(''),
    { fragment: '', directive: '' },
  );
});

test('parseFragmentDirective parses single-piece directive', () => {
  assert.deepEqual(
    parseFragmentDirective('text=hello'),
    { start: 'hello', end: null },
  );
});

test('parseFragmentDirective parses range directive', () => {
  assert.deepEqual(
    parseFragmentDirective('text=hello,world'),
    { start: 'hello', end: 'world' },
  );
});

test('parseFragmentDirective percent-decodes values', () => {
  assert.deepEqual(
    parseFragmentDirective('text=hello%20world'),
    { start: 'hello world', end: null },
  );
});

test('parseFragmentDirective returns null for malformed percent-escape', () => {
  assert.equal(parseFragmentDirective('text=hello%2'), null);
});

test('parseFragmentDirective returns null when no text directive present', () => {
  assert.equal(parseFragmentDirective('foo=bar'), null);
});

test('parseFragmentDirective returns null for empty input', () => {
  assert.equal(parseFragmentDirective(''), null);
});

test('parseFragmentDirective ignores non-text directives and finds text one', () => {
  assert.deepEqual(
    parseFragmentDirective('foo=bar&text=baz'),
    { start: 'baz', end: null },
  );
});

test('normalizeTextDirective encodes single-piece directive', () => {
  assert.equal(
    normalizeTextDirective({ start: 'hello world' }),
    'text=hello%20world',
  );
});

test('normalizeTextDirective encodes range directive', () => {
  assert.equal(
    normalizeTextDirective({ start: 'a b', end: 'c d' }),
    'text=a%20b,c%20d',
  );
});

test('normalizeTextDirective collapses empty end to single-piece', () => {
  assert.equal(
    normalizeTextDirective({ start: 'foo', end: '' }),
    'text=foo',
  );
});

test('normalizeTextDirective rejects empty start', () => {
  assert.equal(normalizeTextDirective({ start: '', end: 'x' }), null);
});

test('normalizeTextDirective trims whitespace', () => {
  assert.equal(
    normalizeTextDirective({ start: '  foo  ', end: '  bar  ' }),
    'text=foo,bar',
  );
});

test('buildFragmentDirective builds directive-only hash', () => {
  assert.equal(
    buildFragmentDirective({ start: 'foo' }),
    '#:~:text=foo',
  );
});

test('buildFragmentDirective preserves element fragment', () => {
  assert.equal(
    buildFragmentDirective({ start: 'foo' }, 'section'),
    '#section:~:text=foo',
  );
});

test('buildFragmentDirective returns null for invalid parts', () => {
  assert.equal(buildFragmentDirective({ start: '' }), null);
});

test('round-trip: parse then build yields a normalised hash', () => {
  const parsed = parseFragmentDirective('text=hello%20world,foo');
  assert.deepEqual(parsed, { start: 'hello world', end: 'foo' });
  assert.equal(
    buildFragmentDirective(parsed),
    '#:~:text=hello%20world,foo',
  );
});
