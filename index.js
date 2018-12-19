/**
 * Module to inline styles while loading the existing stylesheets async
 *
 * @author Ben Zörb @bezoerb https://github.com/bezoerb
 * @copyright Copyright (c) 2014 Ben Zörb
 *
 * Licensed under the MIT license.
 * http://bezoerb.mit-license.org/
 * All rights reserved.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const UglifyJS = require('uglify-js');
const reaver = require('reaver');
const postcss = require('postcss');
const discard = require('postcss-discard');
const cheerio = require('cheerio');
const render = require('dom-serializer');
const CleanCSS = require('clean-css');
const slash = require('slash');
const normalizeNewline = require('normalize-newline');
const resolve = require('resolve');
const detectIndent = require('detect-indent');
const prettier = require('prettier');

/**
 * Get loadcss + cssrelpreload script
 *
 * @returns {string} Minified loadcss script
 */
function getScript() {
  const loadCssMain = resolve.sync('fg-loadcss');
  const loadCssBase = path.dirname(loadCssMain);

  const loadCSS = read(path.join(loadCssBase, 'cssrelpreload.js'));
  return UglifyJS.minify(loadCSS).code;
}

/**
 * Fixup slashes in file paths for windows
 *
 * @param {string} str Filepath
 * @return {string} Normalized path
 */
function normalizePath(str) {
  return process.platform === 'win32' ? slash(str) : str;
}

/**
 * Read file *
 * @param {string} file Filepath
 * @returns {string} Content
 */
function read(file) {
  return fs.readFileSync(file, 'utf8');
}

/**
 * Get the indentation of the link tags
 * @param {string} html Html source
 * @param {Cheerio} $el Cheerio object
 * @returns {string} Indetation
 */
function getIndent(html, $el) {
  const regName = new RegExp(_.escapeRegExp(_.get($el, 'name')));
  const regHref = new RegExp(_.escapeRegExp(_.get($el, 'attribs.href')));
  const regRel = new RegExp(_.escapeRegExp(_.get($el, 'attribs.rel')));
  const lines = _.filter(html.split(/[\r\n]+/), line => {
    return regName.test(line) && regHref.test(line) && regRel.test(line);
  });
  return detectIndent(lines.join('\n')).indent;
}

/**
 * Minify CSS
 * @param {string} styles CSS
 * @returns {string} Minified css string
 */
function minifyCSS(styles) {
  return new CleanCSS().minify(styles).styles; // eslint-disable-line prefer-destructuring
}

function prettifyCSS(styles) {
  return prettier.format(styles, {parser: 'css'});
}

function extract(css, critical) {
  css = minifyCSS(css);
  critical = minifyCSS(critical);
  return normalizeNewline(postcss(discard({css: critical})).process(css).css);
}

/**
 * Helper to prevent cheerio from messing with svg contrnt.
 * Should be merged afe´ter https://github.com/fb55/htmlparser2/pull/259
 * @param {string} str HTML String
 * @returns {array} SVG Strings found in HTML
 */
const getSvgs = (str = '') => {
  const indices = [];
  let start = str.indexOf('<svg', 0);
  let end = str.indexOf('</svg>', start) + 6;
  while (start >= 0) {
    indices.push({start, end});
    start = str.indexOf('<svg', end);
    end = str.indexOf('</svg>', end) + 6;
  }

  return indices.map(({start, end}) => str.substring(start, end));
};

/**
 * Main function ;)
 * @param {string} html HTML String
 * @param {string} styles CSS String
 * @param {object} options Options
 * @returns {string} HTML Source with inlined critical css
 */
function inline(html, styles, options) {
  if (!_.isString(html)) {
    html = String(html);
  }

  const o = _.assign(
    {
      minify: true,
    },
    options || {}
  );

  const $ = cheerio.load(html, {
    decodeEntities: false,
  });

  // Fetch styles already inlined
  const inlineStyles = $('head style')
    .map((i, el) => $(el).html())
    .get()
    .join('\n');

  // Only missing styles
  let missing = extract(styles, inlineStyles);
  if (!o.minify) {
    missing = prettifyCSS(missing);
  }

  const inlined = `${inlineStyles}\n${missing}`;
  const allLinks = $('link[rel="stylesheet"], link[rel="preload"][as="style"]').filter(function() {
    return !$(this).parents('noscript').length;
  });

  let links = allLinks.filter('[rel="stylesheet"]');

  const target = o.selector || allLinks.get(0) || $('head script').get(0);
  const {indent} = detectIndent(html);
  const targetIndent = getIndent(html, target);
  const $target = $(target);

  if (_.isString(o.ignore)) {
    o.ignore = [o.ignore];
  }

  if (o.ignore) {
    links = _.filter(links, link => {
      const href = $(link).attr('href');
      return (
        _.findIndex(o.ignore, arg => {
          return (_.isRegExp(arg) && arg.test(href)) || arg === href;
        }) === -1
      );
    });
  }

  if (missing) {
    const elements = [
      '<style>',
      indent +
        missing
          .replace(/(\r\n|\r|\n)/g, '$1' + targetIndent + indent)
          .replace(/^[\s\t]+$/g, '')
          .trim(),
      '</style>',
      '',
    ]
      .join('\n' + targetIndent)
      .replace(/(\r\n|\r|\n)[\s\t]+(\r\n|\r|\n)/g, '$1$2');

    if ($target.length > 0) {
      // Insert inline styles right before first <link rel="stylesheet" /> or other target
      $target.before(elements);
    } else {
      // Just append to the head
      $('head').append(elements);
    }
  }

  if (links.length > 0) {
    // Modify links and ad clones to noscript block
    $(links).each(function(idx, el) {
      if (o.extract && !o.basePath) {
        throw new Error('Option `basePath` is missing and required when using `extract`!');
      }

      const $el = $(el);
      const elIndent = getIndent(html, el);

      if (o.extract) {
        const href = $el.attr('href');
        const file = path.resolve(path.join(o.basePath, href));
        if (fs.existsSync(file)) {
          const orig = fs.readFileSync(file);
          let diff = extract(orig, inlined);

          if (!o.minify) {
            diff = prettifyCSS(diff);
          }

          const filename = reaver.rev(file, diff);

          fs.writeFileSync(filename, diff);
          $el.attr('href', normalizePath(reaver.rev(href, diff)));
        }
      }

      // Add each fallback right behind the current style to keep source order when ignoring stylesheets
      $el.after('\n' + elIndent + '<noscript>' + render(this) + '</noscript>');

      // Add preload atttibutes to actual link element
      $el.attr('rel', 'preload');
      $el.attr('as', 'style');
      $el.attr('onload', "this.onload=null;this.rel='stylesheet'");
    });

    // Add loadcss + cssrelpreload polyfill
    const scriptAnchor = $('link[rel="stylesheet"], noscript')
      .filter(function() {
        return !$(this).parents('noscript').length;
      })
      .last()
      .get(0);

    $(scriptAnchor).after('\n' + targetIndent + '<script>' + getScript() + '</script>');
  }

  const output = $.html();

  // Quickfix until https://github.com/fb55/htmlparser2/pull/259 is merged/fixed
  const svgs = getSvgs(html);
  const quickfixed = getSvgs(output).reduce((str, code, index) => str.replace(code, svgs[index] || code), output);

  return Buffer.from(quickfixed);
}

module.exports = inline;
