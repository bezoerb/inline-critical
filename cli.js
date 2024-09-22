#!/usr/bin/env node
import {EOL} from 'node:os';
import {readFileSync} from 'node:fs';
import process from 'node:process';
import meow from 'meow';
import picocolors from 'picocolors';
import indentString from 'indent-string';
import stdin from 'get-stdin';
import {parse} from '@adobe/css-tools';
import escapeRegExp from 'lodash.escaperegexp';
import defaults from 'lodash.defaults';
import {inline as inlineCritical} from './index.js';

let ok;
const help = `
Usage: inline-critical <input> [<option>]

Options:
    -c, --css       Path to CSS file
    -h, --html      Path to HTML file
    -i, --ignore    Skip matching stylesheets
    -m, --minify    Minify the styles before inlining (default)

    -e, --extract   Remove the inlined styles from any stylesheets referenced in the HTML
    -b, --base      Is used when extracting styles to find the files references by href attributes
    -s, --selector  Optionally defines the element used by loadCSS as a reference for inlining

    --strategy      body|media|swap|polyfill
`;

const cli = meow(help, {
  autoHelp: true,
  autoVersion: true,
  importMeta: import.meta,
  flags: {
    css: {
      type: 'string',
      shortFlag: 'c',
    },
    html: {
      type: 'string',
      shortFlag: 'h',
    },
    ignore: {
      type: 'string',
      shortFlag: 'i',
      isMultiple: true,
    },
    minify: {
      type: 'boolean',
      shortFlag: 'm',
      default: true,
    },
    extract: {
      type: 'boolean',
      shortFlag: 'e',
    },
    base: {
      type: 'string',
      shortFlag: 'b',
    },
    selector: {
      type: 'string',
      shortFlag: 's',
    },
    preload: {
      type: 'boolean',
      shortFlag: 'p',
      default: false,
    },
    polyfill: {
      type: 'boolean',
      default: false,
    },
    noscript: {
      type: 'string',
    },
    strategy: {
      type: 'string',
    },
  },
});

// Cleanup cli flags
cli.flags = Object.entries(cli.flags).reduce((result, [key, value]) => {
  if (key.length <= 1) {
    return result;
  }

  switch (key) {
    case 'css':
    case 'html': {
      try {
        result[key] = read(value);
      } catch {}

      break;
    }

    case 'base': {
      result.basePath = value;
      break;
    }

    case 'ignore': {
      result.ignore = (value || []).map((ignore) => {
        // Check regex
        const {groups} = /^\/(?<expression>.*)\/(?<flags>[igmy]+)?$/.exec(ignore) || {};
        const {expression, flags} = groups || {};

        if (groups) {
          return new RegExp(escapeRegExp(expression), flags);
        }

        return ignore;
      });
      break;
    }

    default: {
      result[key] = value;
      break;
    }
  }

  return result;
}, {});

function processError(error) {
  process.stderr.write(picocolors.red(indentString(`Error: ${error.message || error}`, 2)));
  process.stderr.write(EOL);
  process.stderr.write(indentString(help, 2));
  process.exit(1);
}

function read(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch (error) {
    processError(error);
  }
}

function run(data) {
  const options_ = defaults(cli.flags, {basePath: process.cwd()});
  ok = true;

  if (data) {
    // Detect html
    try {
      parse(data);
      options_.css = data;
    } catch {
      options_.html = data;
    }
  }

  for (const file of cli.input || []) {
    const temporary = read(file);
    try {
      parse(temporary);
      options_.css = temporary;
    } catch {
      options_.html = temporary;
    }
  }

  if (!options_.html || !options_.css) {
    cli.showHelp();
  }

  const {html, css: styles, ...options} = options_;

  try {
    const out = inlineCritical(html, styles, options);
    process.stdout.write(out?.toString() ?? '', process.exit);
  } catch (error) {
    processError(error);
  }
}

// Get stdin
setTimeout(() => {
  if (ok) {
    return;
  }

  run();
}, 100);

const input = await stdin();
run(input);
