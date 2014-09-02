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
var cheerio = require('cheerio');
var CleanCSS = require('clean-css');

module.exports = function(html, styles, minify) {

  var $ = cheerio.load(String(html));
  var links = $('link[rel="stylesheet"]');
  var noscript = $('<noscript>\n</noscript>');

  // minify if minify option is set
  if (minify) {
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
