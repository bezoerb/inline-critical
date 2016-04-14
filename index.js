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

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var UglifyJS = require('uglify-js');
var cave = require('cave');
var reaver = require('reaver');
var cheerio = require('cheerio');
var render = require('dom-serializer');
var parse = require('cheerio/lib/parse');
var CleanCSS = require('clean-css');
var slash = require('slash');
var normalizeNewline = require('normalize-newline');
var resolve = require('resolve');

var loadCssMain = resolve.sync('fg-loadcss');
var loadCssBase = path.dirname(loadCssMain);

var loadCSS = read(loadCssMain) + read(path.join(loadCssBase, 'cssrelpreload.js'));
loadCSS = UglifyJS.minify(loadCSS, {fromString: true}).code;

/**
 * Fixup slashes in file paths for windows
 * @param {string} str
 * @return {string}
 */
function normalizePath(str) {
    return process.platform === 'win32' ? slash(str) : str;
}

/**
 * Read file *
 * @param {string} file
 * @returns {string}
 */
function read(file) {
    return fs.readFileSync(file, 'utf8');
}

function filter($, options, reject) {
    return function (index, element) {
        var href = $(element).attr('href');
        var i = _.findIndex(options.ignore, function (arg) {
            return _.isRegExp(arg) && arg.test(href) || arg === href;
        });
        return reject ? i === -1 : i !== -1;
    };
}

module.exports = function (html, styles, options) {
    var $ = cheerio.load(String(html), {
        decodeEntities: false
    });

    var links = $('link[rel="stylesheet"]').filter(function () {
        return !$(this).parents('noscript').length;
    });

    var o = options || {};
    var target = o.selector || $('link[rel="preload"]').get(0) || links.get(0) || $('script').get(0);
    var $target = $(target);

    if (_.isString(o.ignore)) {
        o.ignore = [o.ignore];
    }

    var ignored = $();
    if (o.ignore) {
        ignored = links.filter(filter($, o));
        links = links.filter(filter($, o, true));
    }

    // minify if minify option is set
    if (o.minify) {
        styles = new CleanCSS().minify(styles).styles;
    }

    // insert inline styles right before first <link rel="stylesheet" />
    $target.before('<style type="text/css">\n' + styles + '\n</style>\n');

    if (links.length) {
        var noscript = $('<noscript>\n</noscript>');

        // insert noscript block right after stylesheets
        $target.after(noscript);

        var hrefs = links.map(function (idx, el) {
            return $(el).attr('href');
        }).toArray();

        // extract styles from stylesheets if extract option is set
        if (o.extract) {
            if (!o.basePath) {
                throw new Error('Option `basePath` is missing and required when using `extract`!');
            }
            hrefs = hrefs.map(function (href) {
                var file = path.resolve(path.join(o.basePath, href));
                if (!fs.existsSync(file)) {
                    return href;
                }
                var diff = normalizeNewline(cave(file, {css: styles}));
                fs.writeFileSync(reaver.rev(file, diff), diff);
                return normalizePath(reaver.rev(href, diff));
            });
        }

        // add ignored elements right above the processed ones
        noscript.before(ignored);

        // wrap links to stylesheets in noscript block so that they will evaluated when js is turned off
        links.each(function (idx) {
            var el = $(this);
            el.attr('href', hrefs[idx]);
            noscript.append(el);
            noscript.append('\n');
            noscript.before('<link rel="preload" href="' + hrefs[idx] + '" as="style" onload="this.rel=\'stylesheet\'">\n');
        });

        // build js block to load blocking stylesheets and insert it right before
        // exposes async stylesheets as global asyncss array which could be used with onloadCSS
        noscript.after('\n<script id="loadcss">\n' + loadCSS + '\n</script>\n');
    }

    var dom = parse($.html());
    var markup = render(dom);

    return new Buffer(markup);
};
