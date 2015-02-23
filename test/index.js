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

  it('should not strip of svg closing tags', function(done) {
    var html = read('test/fixtures/entities.html');
    var out = inlineCritical(html, '');

    expect(strip(out.toString('utf-8'))).to.be.equal(strip(html));
    done();
  });

  it('should not keep external urls', function(done) {

    function strip2(string) {
      return string.replace(/\s+/gm,'');
    }

    var html = read('test/fixtures/external.html');
    var expected = read('test/expected/external-expected.html');
    var css = read('test/fixtures/critical.css');
    var out = inlineCritical(html, css);

    write('test/expected/external-expected2.html',out);

    expect(strip2(out.toString('utf-8'))).to.be.equal(strip2(expected));
    done();
  });

  it('should not keep external urls on extract', function(done) {

    function strip2(string) {
      return string.replace(/\s+/gm,'');
    }

    var html = read('test/fixtures/external.html');
    var expected = read('test/expected/external-extract-expected.html');
    var css = read('test/fixtures/critical.css');
    var out = inlineCritical(html, css, { extract: true, basePath: 'test/fixtures' });

    write('test/expected/external-expected2.html',out);

    expect(strip2(out.toString('utf-8'))).to.be.equal(strip2(expected));
    done();
  });
});
