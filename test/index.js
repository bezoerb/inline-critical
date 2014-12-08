'use strict';

var expect = require('chai').expect;
var reaver = require('reaver');
var fs = require('fs');
var inlineCritical = require('..');

function strip(string) {
  return string.replace(/[\r\n]+/mg,' ').replace(/\s+/gm,'');
}

function read (file) {
  return fs.readFileSync(file, 'utf8');
}

function write (file, data) {
  fs.writeFileSync(file, data);
}

describe('inline-critical', function() {
  it('should inline css', function(done) {
    var html = read('test/fixtures/index.html');
    var css = read('test/fixtures/critical.css');

    var expected = read('test/expected/index-inlined-async-final.html');
    var out = inlineCritical(html, css);

    expect(strip(out.toString('utf-8'))).to.be.equal(strip(expected));

    done();
  });


  it('should inline and minify css', function(done) {
    var html = read('test/fixtures/index.html');
    var css = read('test/fixtures/critical.css');

    var expected = read('test/expected/index-inlined-async-minified-final.html');
    var out = inlineCritical(html, css, { minify: true });

    expect(strip(out.toString('utf-8'))).to.be.equal(strip(expected));

    done();
  });


  it('should inline and extract css', function(done) {
    var html = read('test/fixtures/cartoon.html');
    var css = read('test/fixtures/critical.css');
    var expected = read('test/expected/cartoon-expected.css');
    var expectedHtml = read('test/expected/cartoon-expected.html');

    var out = inlineCritical(html, css, { extract: true, basePath: 'test/fixtures' });

    expect(read(reaver.rev('test/fixtures/css/cartoon.css', expected))).to.be.equal(expected);
    expect(strip(out.toString('utf-8'))).to.be.equal(strip(expectedHtml));

    done();
  });
});
