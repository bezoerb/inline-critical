/* eslint-env jest */
const reaver = require('reaver');
const inline = require('..');

const {read, checkAndDelete, strip} = require('./helper');

jest.setTimeout(20000);

test('Inline css', async () => {
  const html = await read('fixtures/index.html');
  const css = await read('fixtures/critical.css');
  const expected = await read('expected/index-inlined-async-final.html');
  const out = inline(html, css, {minify: false});

  expect(strip(out.toString())).toBe(strip(expected));
});

test('Inline in head if no stylesheets are there', async () => {
  const html = await read('fixtures/index-nostyle.html');
  const css = await read('fixtures/critical.css');

  const expected = await read('expected/index-nostyle.html');
  const out = inline(html, css, {minify: true});

  expect(strip(out.toString('utf-8'))).toBe(strip(expected));
});

test('Inline absolute css', async () => {
  const html = await read('fixtures/index-absolute.html');
  const css = await read('fixtures/critical.css');

  const expected = await read('expected/index-inlined-absolute.html');
  const out = inline(html, css, {minify: false});

  expect(strip(out.toString('utf-8'))).toBe(strip(expected));
});

test('Inline and minify css', async () => {
  const html = await read('fixtures/index.html');
  const css = await read('fixtures/critical.css');

  const expected = await read('expected/index-inlined-async-minified-final.html');
  const out = inline(html, css, {minify: true});

  expect(strip(out.toString('utf-8'))).toBe(strip(expected));
});

test('should inline and extract css', async () => {
  const html = await read('fixtures/cartoon.html');
  const css = await read('fixtures/critical.css');
  const expected = await read('expected/cartoon-expected.css');
  const expectedHtml = await read('expected/cartoon-expected.html');

  const out = inline(html, css, {
    minify: false,
    extract: true,
    basePath: 'test/fixtures',
  });

  const reved = [
    reaver.rev('fixtures/css/cartoon.css', expected),
    'fixtures/bower_components/bootstrap/dist/css/bootstrap.d561412a.css',
  ];

  const revCartoon = await read(reved[0]);

  expect(checkAndDelete(reved[0])).toBe(true);
  expect(checkAndDelete(reved[1])).toBe(true);
  expect(revCartoon).toBe(expected);
  expect(strip(out.toString('utf-8'))).toBe(strip(expectedHtml));
});

test('should extract and minify css', async () => {
  const html = await read('fixtures/cartoon.html');
  const css = await read('fixtures/critical.css');
  const expected = await read('expected/cartoon-expected-minified.css');
  const expectedHtml = await read('expected/cartoon-expected-minified.html');

  const out = inline(html, css, {
    minify: true,
    extract: true,
    basePath: 'test/fixtures',
  });

  const reved = [
    reaver.rev('fixtures/css/cartoon.css', expected),
    'fixtures/bower_components/bootstrap/dist/css/bootstrap.fe278701.css',
  ];

  const revCartoon = await read(reved[0]);

  expect(checkAndDelete(reved[0])).toBe(true);
  expect(checkAndDelete(reved[1])).toBe(true);
  expect(revCartoon).toBe(expected);
  expect(strip(out.toString('utf-8'))).toBe(strip(expectedHtml));
});

test('should inline and extract css correctly with absolute paths', async () => {
  const html = await read('fixtures/cartoon-absolute.html');
  const css = await read('fixtures/critical.css');
  const expected = await read('expected/cartoon-expected.css');
  const expectedHtml = await read('expected/cartoon-absolute-expected.html');

  const out = inline(html, css, {
    minify: false,
    extract: true,
    basePath: 'test/fixtures',
  });

  const reved = [
    reaver.rev('fixtures/css/cartoon.css', expected),
    'fixtures/bower_components/bootstrap/dist/css/bootstrap.d561412a.css',
  ];

  const revCartoon = await read(reved[0]);

  expect(checkAndDelete(reved[0])).toBe(true);
  expect(checkAndDelete(reved[1])).toBe(true);
  expect(revCartoon).toBe(expected);
  expect(strip(out.toString('utf-8'))).toBe(strip(expectedHtml));
});

test('should not strip of svg closing tags', async () => {
  const html = await read('fixtures/entities.html');
  const out = inline(html, '', {minify: false});

  expect(strip(out.toString('utf-8'))).toBe(strip(html));
});

test('should not strip of svg closing tags test 2', async () => {
  const html = await read('fixtures/svg.html');
  const expected = await read('expected/test-svg.html');
  const css = 'html{font-size:16;}';
  const out = inline(html, css, {minify: true});

  expect(strip(out.toString('utf-8'))).toBe(strip(expected));
});

test('should not keep external urls', async () => {
  function strip2(string) {
    return string.replace(/\s+/gm, '');
  }

  const html = await read('fixtures/external.html');
  const expected = await read('expected/external-expected.html');
  const css = await read('fixtures/critical.css');
  const out = inline(html, css, {minify: false});

  expect(strip2(out.toString('utf-8'))).toBe(strip2(expected));
});

test('should not keep external urls on extract', async () => {
  function strip2(string) {
    return string.replace(/\s+/gm, '');
  }

  const html = await read('fixtures/external.html');
  const expected = await read('expected/external-extract-expected.html');
  const css = await read('fixtures/critical.css');
  const out = inline(html, css, {
    minify: false,
    extract: true,
    basePath: 'test/fixtures',
  });

  const reved = [
    'fixtures/css/main.158f2990.css',
    'fixtures/bower_components/bootstrap/dist/css/bootstrap.d561412a.css',
  ];

  expect(strip2(out.toString('utf-8'))).toBe(strip2(expected));
  expect(checkAndDelete(reved[0])).toBe(true);
  expect(checkAndDelete(reved[1])).toBe(true);
});

test('should keep self closing svg elements', async () => {
  const html = await read('fixtures/entities2.html');
  const out = inline(html, '', {minify: false});
  expect(strip(out.toString('utf-8'))).toBe(strip(html));
});

test('should respect ignore option with string array', async () => {
  function strip2(string) {
    return string.replace(/\s+/gm, '');
  }

  const html = await read('fixtures/external.html');
  const expected = await read('expected/external-ignore-expected.html');
  const css = await read('fixtures/critical.css');
  const out = inline(html, css, {
    minify: false,
    ignore: ['bower_components/bootstrap/dist/css/bootstrap.css'],
  });

  expect(strip2(out.toString('utf-8'))).toBe(strip2(expected));
});

test('should respect single ignore option with string', async () => {
  function strip2(string) {
    return string.replace(/\s+/gm, '');
  }

  const html = await read('fixtures/external.html');
  const expected = await read('expected/external-ignore-expected.html');
  const css = await read('fixtures/critical.css');
  const out = inline(html, css, {
    minify: false,
    ignore: 'bower_components/bootstrap/dist/css/bootstrap.css',
  });

  expect(strip2(out.toString('utf-8'))).toBe(strip2(expected));
});

test('should respect ignore option with RegExp array', async () => {
  function strip2(string) {
    return string.replace(/\s+/gm, '');
  }

  const html = await read('fixtures/external.html');
  const expected = await read('expected/external-ignore-expected.html');
  const css = await read('fixtures/critical.css');
  const out = inline(html, css, {
    minify: false,
    ignore: [/bootstrap/],
  });

  expect(strip2(out.toString('utf-8'))).toBe(strip2(expected));
});

test('should respect selector option', async () => {
  const html = await read('fixtures/index.html');
  const css = await read('fixtures/critical.css');

  const expected = await read('expected/index-before.html');
  const out = inline(html, css, {
    minify: true,
    selector: 'title',
  });

  expect(strip(out.toString('utf-8'))).toBe(strip(expected));
});

test('should ignore stylesheets wrapped in noscript', async () => {
  const html = await read('fixtures/index-noscript.html');
  const css = await read('fixtures/critical.css');

  const expected = await read('expected/index-noscript-inlined-minified-final.html');
  const out = inline(html, css, {minify: true});

  expect(strip(out.toString('utf-8'))).toBe(strip(expected));
});

test("should skip loadcss if it's already present and used for all existing link tags", async () => {
  const html = await read('fixtures/loadcss.html');
  const css = await read('fixtures/critical.css');

  const expected = await read('expected/index-loadcss.html');
  const out = inline(html, css, {minify: true});

  expect(strip(out.toString('utf-8'))).toBe(strip(expected));
});
