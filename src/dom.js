import {readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import detectIndent from 'detect-indent';
import {minify as _minify} from 'uglify-js';

const require = createRequire(import.meta.url);
const loadCssMain = require.resolve('fg-loadcss');

const escapeRegExp = (string) => (string || '').replaceAll(/[\\^$.*+?()[\]{}|]/g, '\\$&');

/**
 * Get loadcss + cssrelpreload script
 *
 * @returns {string} Minified loadcss script
 */
function getScript() {
  const loadCSS = readFileSync(join(dirname(loadCssMain), 'cssrelpreload.js'), 'utf8');

  return _minify(loadCSS).code.trim();
}

/**
 * Flattens an array
 * @param {array} arr Input Array
 * @returns {array} Flattened Array
 */
function flatten(array) {
  return array.reduce((a, b) => [...a, b], []);
}

/**
 * Get all substrings of of the passed tags
 * Does not work with self closing tags
 * @param {string} html Html string
 * @param {string} tag Tagname
 * @returns {array<string>} Array with substrings
 */
const getPartials = (html = '', tag = 'svg') => {
  const result = [];
  html.replaceAll(new RegExp(`<${tag}(?:\\s[^>]+)?>`, 'ig'), (match, offset, string) => {
    if (match.includes('/>')) {
      result.push(string.slice(offset, offset + match.length));
    } else {
      result.push(string.slice(offset, string.indexOf(`</${tag}>`, offset) + `</${tag}>`.length));
    }

    return match;
  });

  return result;
};

/**
 * Replace all partials defined by tagname in source with the corresponding
 * partials found in dest
 * @param {string} source Source HTML String
 * @param {string} dest Dest HTML String
 * @param {string} tag Tagname (svg or math)
 * @returns {array} SVG Strings found in HTML
 */
const replacePartials = (source, destination, tag) => {
  if (!Array.isArray(tag)) {
    tag = [tag];
  }

  return tag.reduce((result, tag) => {
    // Only replace head so we don't mess with the orignal markup
    const newTags = getPartials(destination, tag);
    const oldTags = getPartials(result, tag);

    return oldTags.reduce((string, code, index) => string.replace(code, newTags[index] || code), result);
  }, source);
};

class Dom {
  constructor(html, {minify = true, noscript = 'body'} = {}) {
    const jsdom = new JSDOM(html.trim());
    const {window} = jsdom;
    const {document} = window;
    document.$jsdom = jsdom;
    this.noscriptPosition = noscript;
    this.minify = minify;
    this.html = html;
    this.document = document;
    this.window = window;
    this.jsdom = jsdom;
    this.noscript = [];
    this.headElements = [];
    this.bodyElements = [];

    this.indent = detectIndent(html);
  }

  serialize() {
    const html = this.jsdom.serialize();

    // Only replace head so we don't mess with the orignal markup
    // See https://github.com/fb55/htmlparser2/pull/259 (htmlparser2)
    // See https://runkit.com/582b0e9ebe07a80014bf1e82/58400d2db3ef0f0013bae090 (parse5)
    // The current parsers have problems with foreign context elements like svg & math
    let result = replacePartials(this.html, html, 'head');

    const head =
      this.noscriptPosition === 'head' && this.noscriptPosition !== false
        ? [...this.headElements, ...this.noscript]
        : [...this.headElements];
    const body =
      this.noscriptPosition !== 'head' && this.noscriptPosition !== false
        ? [...this.bodyElements, ...this.noscript]
        : [...this.bodyElements];

    if (head.length > 0) {
      const [, match] = /^([^\S\r\n]*)<\/\s*head>/gim.exec(result) || ['', null];
      const nl = match === null ? '' : `\n`;
      const headContent = `${this.indent.indent}${this.indent.indent}${head.join(`${nl}${this.indent.indent}${this.indent.indent}`)}`;

      result = result.replaceAll(`${match || ''}</head>`, `${headContent}${nl}${this.indent.indent}</head>`);
    }

    if (body.length > 0) {
      const [, match] = /^([^\S\r\n]*)<\/\s*body>/gim.exec(result) || ['', null];
      const nl = match === null ? '' : `\n`;
      const bodyContent = `${this.indent.indent}${this.indent.indent}${body.join(`${nl}${this.indent.indent}${this.indent.indent}`)}`;

      result = result.replaceAll(`${match || ''}</body>`, `${bodyContent}${nl}${this.indent.indent}</body>`);
    }

    return result;
  }

  createStyleNode(css) {
    const styles = this.document.createElement('style');
    styles.append(this.document.createTextNode(css));
    return styles;
  }

  createElement(tag) {
    return this.document.createElement(tag);
  }

  addElementToBody(element) {
    this.bodyElements.push(element.outerHTML);
  }

  getInlineStyles() {
    return [...this.document.querySelectorAll('head style')].map((node) => node.textContent);
  }

  getExternalStyles() {
    return [...this.document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"]')].filter(
      (link) => link.parentElement.tagName !== 'NOSCRIPT'
    );
  }

  querySelector(...selector) {
    const s = flatten(selector).filter(Boolean).join(',');

    return this.document.querySelector(s);
  }

  querySelectorAll(...selector) {
    const s = flatten(selector).filter(Boolean).join(',');

    return this.document.querySelectorAll(s);
  }

  addInlineStyles(css, target) {
    if (target) {
      this.insertStylesBefore(css, target);
    } else {
      this.appendStyles(css, this.querySelector('head'));
    }
  }

  getNodeIndent(node) {
    const reg = new RegExp(`([^\\S\\r\\n]*)${escapeRegExp(node.outerHTML)}`);
    const [, indent] = reg.exec(this.jsdom.serialize()) || ['', ''];
    return indent || '';
  }

  insertStylesBefore(css, referenceNode) {
    const styles = this.createStyleNode(css);
    this.insertBefore(styles, referenceNode);
  }

  appendStyles(css, referenceNode) {
    const styles = this.createStyleNode(css);
    referenceNode.append(styles);
    styles.before(this.document.createTextNode(this.indent.indent));
    styles.after(this.document.createTextNode(`\n${this.indent.indent}`));
  }

  addNoscript(link) {
    const noscript = this.document.createElement('noscript');
    noscript.append(link.cloneNode());
    this.noscript = [...new Set([...this.noscript, `<noscript>${noscript.innerHTML}</noscript>`])];
  }

  insertBefore(node, referenceNode) {
    const indent = this.getNodeIndent(referenceNode);
    referenceNode.before(node);
    if (indent.length > 0) {
      node.after(this.document.createTextNode(`\n${indent}`));
    }
  }

  insertAfter(node, referenceNode) {
    const indent = this.getNodeIndent(referenceNode);
    referenceNode.after(node);
    if (indent.length > 0) {
      referenceNode.after(this.document.createTextNode(`\n${indent}`));
    }
  }

  remove(node) {
    while (
      node.previousSibling &&
      node.previousSibling.nodeName === '#text' &&
      node.previousSibling.textContent.trim() === ''
    ) {
      node.previousSibling.remove();
    }

    node.remove();
  }

  maybeAddLoadcss() {
    // Only add loadcss if it's not already included
    const loadCssIncluded = [...this.document.querySelectorAll('script')].some((tag) =>
      (tag.textContent || '').includes('loadCSS')
    );

    if (loadCssIncluded) {
      return;
    }

    // Add loadcss + cssrelpreload polyfill
    const nodes = [
      ...this.document.querySelectorAll('head link[rel="stylesheet"],head link[rel="preload"],head noscript'),
    ].filter((link) => link.parentElement.tagName !== 'NOSCRIPT');
    const scriptAnchor = nodes.pop();
    const script = this.document.createElement('script');
    script.append(this.document.createTextNode(getScript()));

    if (scriptAnchor) {
      this.insertAfter(script, scriptAnchor);
    }
  }
}

export default Dom;
