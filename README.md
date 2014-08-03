# inline-critical

Inline critical-path css and load the existing stylesheets asynchronously.
Existing link tags will also be wrapped in <noscript> so the users with javscript disabled will see the site rendered normally.

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
