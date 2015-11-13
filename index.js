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

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
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
var loadCSS = read(resolve.sync('fg-loadcss'));
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

module.exports = function (html, styles, options) {
    var $ = cheerio.load(String(html), {
        decodeEntities: false
    });

    var links = $('link[rel="stylesheet"]').filter(function () {
        return !$(this).parents('noscript').length;
    });

    var o = options || {};
    var target = o.selector || links.get(0) || $('script').get(0);
    var $target = $(target);

    if (_.isString(o.ignore)) {
        o.ignore = [o.ignore];
    }

    if (o.ignore) {
        links = links.filter(function () {
            var href = $(this).attr('href');
            return _.findIndex(o.ignore, function (arg) {
                return _.isRegExp(arg) && arg.test(href) || arg === href;
            }) === -1;
        });
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

        // wrap links to stylesheets in noscript block so that they will evaluated when js is turned off
        links.each(function (idx) {
            var el = $(this);
            el.attr('href', hrefs[idx]);
            noscript.append(el);
            noscript.append('\n');
        });

        // build js block to load blocking stylesheets and insert it right before
        noscript.before('<script id="loadcss">\n' +
            '(function(u,s){' +
            loadCSS +
            'for(var i in u){loadCSS(u[i],s);}' +
            '}([\'' + hrefs.join('\',\'') + '\'],document.getElementById("loadcss")));\n' +
            '</script>\n');
    }

    var dom = parse($.html());
    var markup = render(dom);

    return new Buffer(markup);
};
