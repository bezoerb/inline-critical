#!/usr/bin/env node
'use strict';
const os = require('os');
const fs = require('fs');
const meow = require('meow');
const indentString = require('indent-string');
const stdin = require('get-stdin');
const css = require('css');
const _ = require('lodash');
const inlineCritical = require('./');

let ok;
const help = [
    'Usage: inline-critical <input> [<option>]',
    '',
    'Options:',
    '   -c, --css       Path to CSS file',
    '   -h, --html      Path to HTML file',
    '   -i, --ignore    Skip matching stylesheets',
    '   -m, --minify    Minify the styles before inlining (default)',
    '   -e, --extract   Remove the inlined styles from any stylesheets referenced in the HTML',
    '   -b, --base      Is used when extracting styles to find the files references by `href` attributes',
    '   -s, --selector  Optionally defines the element used by loadCSS as a reference for inlining'
];

const cli = meow({
    help
}, {
    alias: {
        c: 'css',
        h: 'html',
        i: 'ignore',
        m: 'minify',
        b: 'base',
        e: 'extract',
        s: 'selector'
    }
});

// Cleanup cli flags
cli.flags = _.reduce(cli.flags, (res, val, key) => {
    if (key.length <= 1) {
        return res;
    }

    switch (key) {
        case 'css':
        case 'html':
            try {
                res[key] = read(val);
            } catch (err) {
            }
            break;
        case 'base':
            res.basePath = val;
            break;
        case 'ignore':
            if (_.isString(val) || _.isRegExp(val)) {
                val = [val];
            }
            res.ignore = _.map(val || [], ignore => {
                // Check regex
                const match = ignore.match(/^\/(.*)\/([igmy]+)?$/);

                if (match) {
                    return new RegExp(_.escapeRegExp(match[1]), match[2]);
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

function error(err) {
    process.stderr.write(indentString('Error: ' + (err.message || err), 4));
    process.stderr.write(os.EOL);
    process.stderr.write(indentString(help.join(os.EOL), 4));
    process.exit(1);
}

function read(file) {
    try {
        return fs.readFileSync(file, 'utf8');
    } catch (err) {
        error(err);
    }
}

function run(data) {
    const opts = _.defaults(cli.flags, {basePath: process.cwd()});
    ok = true;

    if (data) {
        // Detect html
        try {
            css.parse(data);
            opts.css = data;
        } catch (err) {
            opts.html = data;
        }
    }

    _.forEach(cli.input, file => {
        const tmp = read(file);
        try {
            css.parse(tmp);
            opts.css = tmp;
        } catch (err) {
            opts.html = tmp;
        }
    });

    if (!opts.html || !opts.css) {
        cli.showHelp();
    }

    try {
        const out = inlineCritical(opts.html, opts.css, opts);
        process.stdout.write(out.toString(), process.exit);
    } catch (err) {
        error(err);
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
