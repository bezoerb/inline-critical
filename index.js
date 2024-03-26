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

import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import process from 'node:process';
import {Buffer} from 'node:buffer';
import {resolve, join} from 'node:path';
import isString from 'lodash.isstring';
import isRegExp from 'lodash.isregexp';
import reaver from 'reaver';
import slash from 'slash';
import Dom from './src/dom.js';
import {removeDuplicateStyles} from './src/css.js';

const DEFAULT_OPTIONS = {
  extract: false,
  ignore: [],
  replaceStylesheets: false,
  noscript: 'body',
  strategy: undefined,
};

/**
 * Fixup slashes in file paths for windows
 *
 * @param {string} str Filepath
 * @return {string} Normalized path
 */
function normalizePath(string) {
  return process.platform === 'win32' ? slash(string) : string;
}

/**
 * Main function ;)
 * @param {string} html HTML String
 * @param {string} styles CSS String
 * @param {object} options Options
 * @returns {string} HTML Source with inlined critical css
 */
export function inline(html, styles, options) {
  const o = {...DEFAULT_OPTIONS, ...options};

  if (!isString(html)) {
    html = String(html);
  }

  if (!isString(styles)) {
    styles = String(styles);
  }

  if (!Array.isArray(o.ignore)) {
    o.ignore = [o.ignore].filter(Boolean);
  }

  const document = new Dom(html, o);

  const inlineStyles = document.getInlineStyles();
  const externalStyles = document.getExternalStyles();
  const missingStyles = removeDuplicateStyles(styles, ...inlineStyles);

  const links = externalStyles.filter((link) => {
    // Only take stylesheets
    const stylesheet = link.getAttribute('rel') === 'stylesheet';
    // Filter ignored links
    const href = link.getAttribute('href');
    return stylesheet && !o.ignore.some((i) => (isRegExp(i) && i.test(href)) || i === href);
  });

  const targetSelectors = [
    o.selector,
    ':not(noscript) > link[rel="stylesheet"]',
    ':not(noscript) > link[rel="preload"][as="style"]',
    'head script',
  ];

  const target = document.querySelector(targetSelectors);
  const inlined = `${inlineStyles}\n${missingStyles}`;

  if (missingStyles) {
    document.addInlineStyles(missingStyles, target);
  }

  const noscriptFallback = o.polyfill || o.strategy === 'polyfill' || o.strategy === 'swap' || o.strategy === 'media';

  // Add loadcss if it's not already loaded
  if (o.polyfill || o.strategy === 'polyfill') {
    document.maybeAddLoadcss();
  }

  if (Array.isArray(o.replaceStylesheets) && links.length > 0) {
    // Detect links to be removed
    const [reference] = links;
    const removable = [...document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"]')].filter(
      (link) => {
        // Filter ignored links
        const href = link.getAttribute('href');
        return !o.ignore.some((i) => (isRegExp(i) && i.test(href)) || i === href);
      }
    );

    // Add link tags before old links
    for (const href of o.replaceStylesheets) {
      const link = document.createElement('link');

      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('href', href);
      reference.before(link);

      if (noscriptFallback) {
        document.addNoscript(link);
      }

      if (o.polyfill || o.strategy === 'polyfill' || o.strategy === 'swap') {
        link.setAttribute('rel', 'preload');
        link.setAttribute('as', 'style');
        link.setAttribute('onload', "this.onload=null;this.rel='stylesheet'");
      } else if (o.strategy === 'media') {
        // @see https://www.filamentgroup.com/lab/load-css-simpler/
        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('media', 'print');
        link.setAttribute('onload', `this.media='all'`);
      } else {
        link.setAttribute('rel', 'preload');
        link.setAttribute('as', 'style');
        const bodyLink = document.createElement('link');
        bodyLink.setAttribute('rel', 'stylesheet');
        bodyLink.setAttribute('href', href);
        document.addElementToBody(bodyLink);

        if (o.strategy === 'body') {
          document.remove(link);
        }
      }
    }

    // Remove old links
    for (const link of removable) {
      if (link.parentElement.tagName === 'NOSCRIPT') {
        document.remove(link.parentElement);
      } else {
        document.remove(link);
      }
    }
  } else {
    // Modify links and add clones to noscript block
    for (const link of links) {
      const href = link.getAttribute('href');
      const media = link.getAttribute('media');
      const type = link.getAttribute('type');
      const integrity = link.getAttribute('integrity');

      if (['print', 'speech'].includes(media)) {
        continue;
      }

      if (o.extract) {
        const file = resolve(join(o.basePath || process.cwd, href));

        if (existsSync(file)) {
          const orig = readFileSync(file);
          const diff = removeDuplicateStyles(orig, inlined);
          const filename = reaver.rev(file, diff);

          writeFileSync(filename, diff);
          link.setAttribute('href', normalizePath(reaver.rev(href, diff)));
        } else if (!/\/\//.test(href)) {
          throw new Error(`Error: file "${href}" not found in "${o.basePath || process.cwd}". Specify base path.`);
        }
      }

      if (noscriptFallback) {
        document.addNoscript(link);
      }

      if (o.polyfill || o.strategy === 'polyfill' || o.strategy === 'swap') {
        link.setAttribute('rel', 'preload');
        link.setAttribute('as', 'style');
        link.setAttribute('onload', "this.onload=null;this.rel='stylesheet'");
      } else if (o.strategy === 'media') {
        // @see https://www.filamentgroup.com/lab/load-css-simpler/
        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('media', 'print');
        link.setAttribute('onload', `this.media='${media || 'all'}'`);
      } else {
        link.setAttribute('rel', 'preload');
        link.setAttribute('as', 'style');
        link.removeAttribute('media');
        if (type) {
          link.removeAttribute('type');
        }

        const bodyLink = document.createElement('link');
        bodyLink.setAttribute('rel', 'stylesheet');
        if (media) {
          bodyLink.setAttribute('media', media);
        }

        if (integrity) {
          bodyLink.setAttribute('integrity', integrity);
        }

        if (type) {
          bodyLink.setAttribute('type', type);
        }

        bodyLink.setAttribute('href', link.getAttribute('href'));
        document.addElementToBody(bodyLink);

        if (o.strategy === 'body') {
          document.remove(link);
        }
      }
    }
  }

  return Buffer.from(document.serialize());
}

export default inline;
