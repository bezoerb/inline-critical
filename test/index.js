var expect = require('chai').expect,
    fs = require('fs'),
    inlineCritical = require('..');

/**
 * Strip whitespaces, tabs and newlines and replace with one space.
 * Usefull when comparing string contents.
 * @param string
 */
function stripWhitespace(string) {
    return string.replace(/[\r\n]+/mg,' ').replace(/\s+/gm,'');
}

describe('inline-critical', function() {
    it('should inline css', function(done) {
        var html = fs.readFileSync('test/fixtures/index.html', 'utf8');
        var css = fs.readFileSync('test/fixtures/critical.css', 'utf8');

        var expected = fs.readFileSync('test/fixtures/index-inlined-async-final.html', 'utf8');
        var out = inlineCritical(html, css);

        expect(stripWhitespace(out.toString('utf-8'))).to.be.equal(stripWhitespace(expected));

        done();
    });


    it('should inline and minify css', function(done) {
        var html = fs.readFileSync('test/fixtures/index.html', 'utf8');
        var css = fs.readFileSync('test/fixtures/critical.css', 'utf8');

        var expected = fs.readFileSync('test/fixtures/index-inlined-async-minified-final.html', 'utf8');
        var out = inlineCritical(html, css, true);

        expect(stripWhitespace(out.toString('utf-8'))).to.be.equal(stripWhitespace(expected));

        done();
    });
});
