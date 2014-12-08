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
var UglifyJS = require("uglify-js");
var cave = require('cave');
var reaver = require('reaver');
var cheerio = require('cheerio');
var CleanCSS = require('clean-css');
var slash = require('slash');
var normalizeNewline = require('normalize-newline');
// get loadCSS
var loadCSS = read(path.join(__dirname,'vendor','loadCSS.js'));
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
function read (file) {
  return fs.readFileSync(file, 'utf8');
}




module.exports = function(html, styles, options) {

  var $ = cheerio.load(String(html));
  var links = $('link[rel="stylesheet"]');
  var noscript = $('<noscript>\n</noscript>');
  var o = options || {};

  // minify if minify option is set
  if (o.minify) {
    styles = new CleanCSS().minify(styles);
  }

  // insert inline styles right before first <link rel="stylesheet" />
  links.eq(0).before('<style type="text/css">\n' + styles + '\n</style>\n');
  // insert noscript block right after stylesheets
  links.eq(0).first().after(noscript);

  var hrefs = links.map(function(idx, el) {
    return $(this).attr('href');
  }).toArray();

  // extract styles from stylesheets if extract option is set
  if (o.extract) {
    if (!o.basePath) {
      throw new Error('Option `basePath` is missing and required when using `extract`!');
    }
    hrefs = hrefs.map(function(href) {
      var file = path.resolve(o.basePath, href);
      if (!fs.existsSync(file)) {
        return;
      }
      var diff = normalizeNewline(cave(file, { css: styles }));
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
  $(noscript).before('<script>\n' +
    '(function(u){' +
    loadCSS +
    'for(var i in u){loadCSS(u[i]);}' +
    '}([\'' + hrefs.join('\',\'') + '\']));\n' +
    '</script>\n');

  return new Buffer($.html());
};
