# inline-critical

Inline critical-path css and load the existing stylesheets asynchronously.
Existing link tags will also be wrapped in `<noscript>` so the users with javascript disabled will see the site rendered normally.

[![NPM version][npm-image]][npm-url] [![Build Status][ci-image]][ci-url] [![Dependency Status][depstat-image]][depstat-url] [![Download][dlcounter-image]][dlcounter-url] [![Coverage Status][coveralls-image]][coveralls-url]

## Installation

This module is installed via npm:

```bash
$ npm install inline-critical
```

## Example Usage

```js
const inline = require('inline-critical');
const html = fs.readFileSync('test/fixtures/index.html', 'utf8');
const critical = fs.readFileSync('test/fixtures/critical.css', 'utf8');
const inlined = inline(html, critical);
```

## Example Usage ignoring stylesheet per regex

```js
const inline = require('inline-critical');
const html = fs.readFileSync('test/fixtures/index.html', 'utf8');
const critical = fs.readFileSync('test/fixtures/critical.css', 'utf8');

const inlined = inline(html, critical, {
  ignore: [/bootstrap/],
});
```

## CLI

inline-critical works well with standard input.
You can either pass in the html

```bash
cat index.html | inline-critical critical.css
```

or just flip things around

```bash
cat critical.css | inline-critical index.html
```

or pass in the file as an option

```bash
inline-critical critical.css index.html
```

without having to worry about the correct order

```bash
inline-critical index.html critical.css
```

Run `inline-critical --help` to see the list of options.

## inline(html, styles, options?)

- `html` is the HTML you want to use to inline your critical styles, or any other styles
- `styles` are the styles you're looking to inline
- `options` is an optional configuration object
  - `strategy` select the [preload strategy](#preloadstrategy)
  - `extract` will remove the inlined styles from any stylesheets referenced in the HTML
  - `basePath` will be used when extracting styles to find the files references by `href` attributes
  - `ignore` ignore matching stylesheets when inlining.
  - `selector` defines the element used by loadCSS as a reference for inlining.
  - `noscript` specifies position of noscript fallback ('body' - end of body, 'head' - end of head, false - no noscript)
  - `replaceStylesheets` takes an array of stylesheet hrefs to replace the original links in the document. (Used by critical when you extract uncritical css to a target file)

### PreloadStrategy

The mechanism to use for lazy-loading stylesheets.
_[JS]_ indicates that a strategy requires JavaScript (falls back to `<noscript>`).

- **default:** Move stylesheet links to the end of the document and insert preload meta tags in their place.
- **"body":** Move all external stylesheet links to the end of the document.
- **"media":** Load stylesheets asynchronously by adding `media="print"` and swap to `media="all"` once loaded (https://www.filamentgroup.com/lab/load-css-simpler/). _[JS]_
- **"swap":** Convert stylesheet links to preloads that swap to `rel="stylesheet"` once loaded. _[JS]_
- **"polyfill":** Inject [LoadCSS](https://github.com/filamentgroup/loadCSS) and use it to load stylesheets. _[JS]_

_Adopted from [critters](https://github.com/GoogleChromeLabs/critters#preloadstrategy)_

## License

MIT

[npm-url]: https://npmjs.org/package/inline-critical
[npm-image]: https://img.shields.io/npm/v/inline-critical.svg
[ci-url]: https://github.com/bezoerb/inline-critical/actions?workflow=Tests
[ci-image]: https://github.com/bezoerb/inline-critical/workflows/Tests/badge.svg
[depstat-url]: https://david-dm.org/bezoerb/inline-critical
[depstat-image]: https://img.shields.io/david/bezoerb/inline-critical.svg
[dlcounter-url]: https://www.npmjs.com/package/inline-critical
[dlcounter-image]: https://img.shields.io/npm/dm/inline-critical.svg
[coveralls-url]: https://coveralls.io/github/bezoerb/inline-critical?branch=main
[coveralls-image]: https://img.shields.io/coveralls/github/bezoerb/inline-critical/main.svg
