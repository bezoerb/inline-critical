'use strict';

const CleanCSS = require('clean-css');
const postcss = require('postcss');
const discard = require('postcss-discard');
const normalizeNewline = require('normalize-newline');

/**
 * Minify CSS
 * @param {string} styles CSS
 * @returns {string} Minified css string
 */
function minifyCss(styles) {
  return new CleanCSS().minify(styles).styles;
}

/**
 * Remove styles
 * @param {string} styles CSS
 * @param {array<string>} css CSS
 * @returns {string} css string not containing any of the styles defined in css array
 */
function removeDuplicateStyles(styles, ...css) {
  const _styles = normalizeNewline(minifyCss(styles || ''));
  const _css = normalizeNewline(minifyCss(css.join('\n')));
  if (_css.trim() !== '') {
    return postcss(discard({css: _css})).process(_styles).css;
  }

  return _styles;
}

module.exports = {
  minifyCss,
  removeDuplicateStyles,
};
