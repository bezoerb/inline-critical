#!/usr/bin/env node

'use strict';

const os = require('os');
const fs = require('fs');
const meow = require('meow');
const chalk = require('chalk');
const indentString = require('indent-string');
const stdin = require('get-stdin');
const css = require('css');
const escapeRegExp = require('lodash.escaperegexp');
const defaults = require('lodash.defaults');
const inlineCritical = require('.');

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
  flags: {
    css: {
      type: 'string',
      alias: 'c',
    },
    html: {
      type: 'string',
      alias: 'h',
    },
    ignore: {
      type: 'string',
      alias: 'i',
      isMultiple: true,
    },
    minify: {
      type: 'boolean',
      alias: 'm',
      default: true,
    },
    extract: {
      type: 'boolean',
      alias: 'e',
    },
    base: {
      type: 'string',
      alias: 'b',
    },
    selector: {
      type: 'string',
      alias: 's',
    },
    preload: {
      type: 'boolean',
      alias: 'p',
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
    case 'html':
      try {
        result[key] = read(value);
      } catch {}

      break;
    case 'base':
      result.basePath = value;
      break;
    case 'ignore':
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
    default:
      result[key] = value;
      break;
  }

  return result;
}, {});

function processError(error) {
  process.stderr.write(chalk.red(indentString(`Error: ${error.message || error}`, 2)));
  process.stderr.write(os.EOL);
  process.stderr.write(indentString(help, 2));
  process.exit(1);
}

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
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
      css.parse(data);
      options_.css = data;
    } catch {
      options_.html = data;
    }
  }

  (cli.input || []).forEach((file) => {
    const temporary = read(file);
    try {
      css.parse(temporary);
      options_.css = temporary;
    } catch {
      options_.html = temporary;
    }
  });

  if (!options_.html || !options_.css) {
    cli.showHelp();
  }

  const {html, css: styles, ...options} = options_;

  try {
    const out = inlineCritical(html, styles, options);
    process.stdout.write(out.toString(), process.exit);
  } catch (error) {
    processError(error);
  }
}

// Get stdin
stdin().then(run);
setTimeout(() => {
  if (ok) {
    return;
  }

  run();
}, 100);
