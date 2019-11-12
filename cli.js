#!/usr/bin/env node
'use strict';
const fs = require('fs');
const meow = require('meow');
const indentString = require('indent-string');
const stdin = require('get-stdin');
const css = require('css');
const defaults = require('lodash.defaults');
const escapeRegExp = require('lodash.escaperegexp');
const reduce = require('lodash.reduce');
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
`;

const cli = meow(help, {
    autoHelp: true,
    autoVersion: true,
    flags: {
        css: {
            type: 'string',
            alias: 'c'
        },
        html: {
            type: 'string',
            alias: 'h'
        },
        ignore: {
            type: 'string',
            alias: 'i'
        },
        minify: {
            type: 'boolean',
            alias: 'm'
        },
        extract: {
            type: 'boolean',
            alias: 'e'
        },
        base: {
            type: 'string',
            alias: 'b'
        },
        selector: {
            type: 'string',
            alias: 's'
        }
    }
});

// Cleanup cli flags
cli.flags = reduce(cli.flags, (res, val, key) => {
    if (key.length <= 1) {
        return res;
    }

    switch (key) {
        case 'css':
        case 'html':
            try {
                res[key] = read(val);
            } catch (error) {
            }

            break;
        case 'base':
            res.basePath = val;
            break;
        case 'ignore':
            if (!Array.isArray(val)) {
                val = [val];
            }

            res.ignore = (val || []).map(ignore => {
                // Check regex
                const match = ignore.match(/^\/(.*)\/([igmy]+)?$/);

                if (match) {
                    return new RegExp(escapeRegExp(match[1]), match[2]);
                }

                return ignore;
            });
            break;
        default:
            res[key] = val;
            break;
    }

    return res;
}, {});

function processError(err) {
    process.stderr.write(indentString(`Error: ${err.message || err}`, 4));
    process.stderr.write('\n');
    process.stderr.write(indentString(help, 4));
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
    const opts = defaults(cli.flags, {basePath: process.cwd()});
    ok = true;

    if (data) {
        // Detect html
        try {
            css.parse(data);
            opts.css = data;
        } catch (error) {
            opts.html = data;
        }
    }

    (cli.input || []).forEach(file => {
        const tmp = read(file);
        try {
            css.parse(tmp);
            opts.css = tmp;
        } catch (error) {
            opts.html = tmp;
        }
    });

    if (!opts.html || !opts.css) {
        cli.showHelp();
    }

    try {
        const out = inlineCritical(opts.html, opts.css, opts);
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
