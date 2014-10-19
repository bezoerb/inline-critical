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
var cave = require('cave');
var cheerio = require('cheerio');
var CleanCSS = require('clean-css');

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

  // wrap links to stylesheets in noscript block so that they will evaluated when js is turned off
  var hrefs = links.map(function(idx, el) {
    el = $(el);
    noscript.append(el);
    noscript.append('\n');
    return el.attr('href');
  }).toArray();

  // extract styles from stylesheets if extract option is set
  if (o.extract) {
    if (!o.basePath) {
      throw new Error('Option `basePath` is missing and required when using `extract`!');
    }
    hrefs.forEach(function(href) {
      var file = path.resolve(o.basePath, href);
      if (!fs.existsSync(file)) {
        return;
      }
      var diff = cave(file, { css: styles });
      fs.writeFileSync(file, diff);
    });
  }

  // build js block to load blocking stylesheets
  $('body').append('<script>\n' +
    '(function(d,u){' +
    'for (var i in u) {' +
    'var l=d.createElement(\'link\');' +
    'var r=d.getElementsByTagName(\'script\')[0];' +
    'l.type=\'text/css\';' +
    'l.rel=\'stylesheet\';' +
    'l.media=\'only x\';' +
    'l.href=u[i];' +
    'r.parentNode.insertBefore(l,r);' +
    '(function(l){setTimeout( function(){l.media=\'all\';});})(l)' +
    '}' +
    '}(document,[\'' + hrefs.join('\',\'') + '\']));\n' +
    '</script>\n');

  return new Buffer($.html());
};
