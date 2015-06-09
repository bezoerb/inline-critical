# inline-critical

Inline critical-path css and load the existing stylesheets asynchronously.
Existing link tags will also be wrapped in ```<noscript>``` so the users with javscript disabled will see the site rendered normally.

[![build status](https://secure.travis-ci.org/bezoerb/inline-critical.svg)](http://travis-ci.org/bezoerb/inline-critical)

## Installation

This module is installed via npm:

``` bash
$ npm install inline-critical
```

## Example Usage

``` js
var inline = require('inline-critical');
var html = fs.readFileSync('test/fixtures/index.html', 'utf8');
var critical = fs.readFileSync('test/fixtures/critical.css', 'utf8');

var inlined = inline(html, critical);
```

## Example Usage ignoring stylesheet per regex


``` js
var inline = require('inline-critical');
var html = fs.readFileSync('test/fixtures/index.html', 'utf8');
var critical = fs.readFileSync('test/fixtures/critical.css', 'utf8');

var inlined = inline(html, critical, {
  ignore: [/bootstrap/]
});
```

## inline(html, styles, options?)

- `html` is the HTML you want to use to inline your critical styles, or any other styles
- `styles` are the styles you're looking to inline
- `options` is an optional configuration object
  - `minify` will minify the styles before inlining
  - `extract` will remove the inlined styles from any stylesheets referenced in the HTML
  - `basePath` will be used when extracting styles to find the files references by `href` attributes
  - `ignore` ignore matching stylesheets when inlining.

## License

MIT
