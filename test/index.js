'use strict';
const fs = require('fs');
const path = require('path');
const {exec, execFile} = require('child_process');
const reaver = require('reaver');
const {expect} = require('chai');
const readJson = require('read-package-json');
const mockery = require('mockery');
const concat = require('concat-stream');
const inlineCritical = require('..');

const CAT = process.platform === 'win32' ? 'type' : 'cat';

function strip(string) {
    return string.replace(/[\r\n]+/gm, ' ').replace(/\s+/gm, '');
}

function read(file) {
    return fs.readFileSync(file, 'utf8');
}

describe('Module: inline-critical', () => {
    it('should inline css', done => {
        const html = read('test/fixtures/index.html');
        const css = read('test/fixtures/critical.css');

        const expected = read('test/expected/index-inlined-async-final.html');
        const out = inlineCritical(html, css, {minify: false});
        expect(strip(out.toString('utf-8'))).to.be.equal(strip(expected));

        done();
    });

    it('should inline in head if no stylesheets are there', done => {
        const html = read('test/fixtures/index-nostyle.html');
        const css = read('test/fixtures/critical.css');

        const expected = read('test/expected/index-nostyle.html');
        const out = inlineCritical(html, css, {minify: true});

        expect(strip(out.toString('utf-8'))).to.be.equal(strip(expected));

        done();
    });

    it('should inline absolute css', done => {
        const html = read('test/fixtures/index-absolute.html');
        const css = read('test/fixtures/critical.css');

        const expected = read('test/expected/index-inlined-absolute.html');
        const out = inlineCritical(html, css, {minify: false});

        expect(strip(out.toString('utf-8'))).to.be.equal(strip(expected));

        done();
    });

    it('should inline and minify css', done => {
        const html = read('test/fixtures/index.html');
        const css = read('test/fixtures/critical.css');

        const expected = read(
            'test/expected/index-inlined-async-minified-final.html'
        );
        const out = inlineCritical(html, css, {minify: true});

        expect(strip(out.toString('utf-8'))).to.be.equal(strip(expected));

        done();
    });

    it('should inline and extract css', done => {
        const html = read('test/fixtures/cartoon.html');
        const css = read('test/fixtures/critical.css');
        const expected = read('test/expected/cartoon-expected.css');
        const expectedHtml = read('test/expected/cartoon-expected.html');

        const out = inlineCritical(html, css, {
            minify: false,
            extract: true,
            basePath: 'test/fixtures'
        });
        expect(
            fs.existsSync('test/fixtures/css/cartoon.18d89c7f.css')
        ).to.be.equal(true);
        expect(
            fs.existsSync(
                'test/fixtures/bower_components/bootstrap/dist/css/bootstrap.155ef5f4.css'
            )
        ).to.be.equal(true);
        expect(
            read(reaver.rev('test/fixtures/css/cartoon.css', expected))
        ).to.be.equal(expected);
        expect(strip(out.toString('utf-8'))).to.be.equal(strip(expectedHtml));

        fs.unlinkSync('test/fixtures/css/cartoon.18d89c7f.css');
        fs.unlinkSync(
            'test/fixtures/bower_components/bootstrap/dist/css/bootstrap.155ef5f4.css'
        );
        done();
    });

    it('should extract and minify css', done => {
        const html = read('test/fixtures/cartoon.html');
        const css = read('test/fixtures/critical.css');
        const expected = read('test/expected/cartoon-expected-minified.css');
        const expectedHtml = read('test/expected/cartoon-expected-minified.html');

        const out = inlineCritical(html, css, {
            minify: true,
            extract: true,
            basePath: 'test/fixtures'
        });

        expect(
            fs.existsSync('test/fixtures/css/cartoon.08b3295a.css')
        ).to.be.equal(true);
        expect(
            fs.existsSync(
                'test/fixtures/bower_components/bootstrap/dist/css/bootstrap.c8dce395.css'
            )
        ).to.be.equal(true);
        expect(
            read(reaver.rev('test/fixtures/css/cartoon.css', expected))
        ).to.be.equal(expected);
        expect(strip(out.toString('utf-8'))).to.be.equal(strip(expectedHtml));

        fs.unlinkSync('test/fixtures/css/cartoon.08b3295a.css');
        fs.unlinkSync(
            'test/fixtures/bower_components/bootstrap/dist/css/bootstrap.c8dce395.css'
        );

        done();
    });

    it('should inline and extract css correctly with absolute paths', done => {
        const html = read('test/fixtures/cartoon-absolute.html');
        const css = read('test/fixtures/critical.css');
        const expected = read('test/expected/cartoon-expected.css');
        const expectedHtml = read('test/expected/cartoon-absolute-expected.html');

        const out = inlineCritical(html, css, {
            minify: false,
            extract: true,
            basePath: 'test/fixtures'
        });

        expect(
            fs.existsSync('test/fixtures/css/cartoon.18d89c7f.css')
        ).to.be.equal(true);
        expect(
            fs.existsSync(
                'test/fixtures/bower_components/bootstrap/dist/css/bootstrap.155ef5f4.css'
            )
        ).to.be.equal(true);
        expect(
            read(reaver.rev('test/fixtures/css/cartoon.css', expected))
        ).to.be.equal(expected);
        expect(strip(out.toString('utf-8'))).to.be.equal(strip(expectedHtml));

        fs.unlinkSync('test/fixtures/css/cartoon.18d89c7f.css');
        fs.unlinkSync(
            'test/fixtures/bower_components/bootstrap/dist/css/bootstrap.155ef5f4.css'
        );

        done();
    });

    it('should not strip of svg closing tags', done => {
        const html = read('test/fixtures/entities.html');
        const out = inlineCritical(html, '', {minify: false});

        expect(strip(out.toString('utf-8'))).to.be.equal(strip(html));
        done();
    });

    it('should not strip of svg closing tags test 2', done => {
        const html = read('test/fixtures/svg.html');
        const expected = read('test/expected/test-svg.html');
        const css = 'html{font-size:16;}';
        const out = inlineCritical(html, css, {minify: true});

        expect(strip(out.toString('utf-8'))).to.be.equal(strip(expected));
        done();
    });

    it('should not keep external urls', done => {
        function strip2(string) {
            return string.replace(/\s+/gm, '');
        }

        const html = read('test/fixtures/external.html');
        const expected = read('test/expected/external-expected.html');
        const css = read('test/fixtures/critical.css');
        const out = inlineCritical(html, css, {minify: false});

        expect(strip2(out.toString('utf-8'))).to.be.equal(strip2(expected));
        done();
    });

    it('should not keep external urls on extract', done => {
        function strip2(string) {
            return string.replace(/\s+/gm, '');
        }

        const html = read('test/fixtures/external.html');
        const expected = read('test/expected/external-extract-expected.html');
        const css = read('test/fixtures/critical.css');
        const out = inlineCritical(html, css, {
            minify: false,
            extract: true,
            basePath: 'test/fixtures'
        });

        expect(strip2(out.toString('utf-8'))).to.be.equal(strip2(expected));
        done();
    });

    it('should keep self closing svg elements', done => {
        const html = read('test/fixtures/entities2.html');
        const out = inlineCritical(html, '', {minify: false});
        expect(strip(out.toString('utf-8'))).to.be.equal(strip(html));
        done();
    });

    it('should respect ignore option with string array', done => {
        function strip2(string) {
            return string.replace(/\s+/gm, '');
        }

        const html = read('test/fixtures/external.html');
        const expected = read('test/expected/external-ignore-expected.html');
        const css = read('test/fixtures/critical.css');
        const out = inlineCritical(html, css, {
            minify: false,
            ignore: ['bower_components/bootstrap/dist/css/bootstrap.css']
        });

        expect(strip2(out.toString('utf-8'))).to.be.equal(strip2(expected));
        done();
    });

    it('should respect single ignore option with string', done => {
        function strip2(string) {
            return string.replace(/\s+/gm, '');
        }

        const html = read('test/fixtures/external.html');
        const expected = read('test/expected/external-ignore-expected.html');
        const css = read('test/fixtures/critical.css');
        const out = inlineCritical(html, css, {
            minify: false,
            ignore: 'bower_components/bootstrap/dist/css/bootstrap.css'
        });

        expect(strip2(out.toString('utf-8'))).to.be.equal(strip2(expected));
        done();
    });

    it('should respect ignore option with RegExp array', done => {
        function strip2(string) {
            return string.replace(/\s+/gm, '');
        }

        const html = read('test/fixtures/external.html');
        const expected = read('test/expected/external-ignore-expected.html');
        const css = read('test/fixtures/critical.css');
        const out = inlineCritical(html, css, {
            minify: false,
            ignore: [/bootstrap/]
        });

        expect(strip2(out.toString('utf-8'))).to.be.equal(strip2(expected));
        done();
    });

    it('should respect selector option', done => {
        const html = read('test/fixtures/index.html');
        const css = read('test/fixtures/critical.css');

        const expected = read('test/expected/index-before.html');
        const out = inlineCritical(html, css, {
            minify: true,
            selector: 'title'
        });

        expect(strip(out.toString('utf-8'))).to.be.equal(strip(expected));
        done();
    });

    it('should ignore stylesheets wrapped in noscript', done => {
        const html = read('test/fixtures/index-noscript.html');
        const css = read('test/fixtures/critical.css');

        const expected = read(
            'test/expected/index-noscript-inlined-minified-final.html'
        );
        const out = inlineCritical(html, css, {minify: true});

        expect(strip(out.toString('utf-8'))).to.be.equal(strip(expected));
        done();
    });

    it('should skip loadcss if it\'s already present and used for all existing link tags', done => {
        const html = read('test/fixtures/loadcss.html');
        const css = read('test/fixtures/critical.css');

        const expected = read('test/expected/index-loadcss.html');
        const out = inlineCritical(html, css, {minify: true});

        expect(strip(out.toString('utf-8'))).to.be.equal(strip(expected));
        done();
    });
});

describe('CLI', () => {
    beforeEach(function (done) {
        readJson(
            path.join(__dirname, '../', 'package.json'),
            (err, data) => {
                expect(err).to.not.exist; // eslint-disable-line no-unused-expressions
                this.pkg = data;
                this.bin = path.join(
                    __dirname,
                    '../',
                    data.bin['inline-critical']
                );
                done();
            }
        );
    });

    function handleError(err) {
        expect(err).to.equal(null);
        process.exit(1); // eslint-disable-line unicorn/no-process-exit
    }

    describe('acceptance', () => {
        it('should return the version', function (done) {
            execFile(
                'node',
                [this.bin, '--version'],
                (error, stdout) => {
                    expect(stdout.replace(/\r\n|\n/g, '')).to.equal(
                        this.pkg.version
                    );
                    done();
                }
            );
        });

        it('should work well with the critical CSS & html file passed as input', function (done) {
            const expected = read('test/expected/index-inlined-async-final.html');
            const cp = execFile('node', [
                this.bin,
                'test/fixtures/index.html',
                'test/fixtures/critical.css',
                '--no-minify'
            ]);

            let cnt = 0;
            cp.stdout.pipe(
                concat(data => {
                    cnt++;
                    expect(strip(data.toString('utf-8'))).to.be.equal(
                        strip(expected)
                    );
                })
            );

            cp.stdout.on('error', handleError);
            cp.on('close', () => {
                expect(cnt).to.equal(1);
                done();
            });
        });

        it('should work well with the critical CSS passed as input & html file passed as option', function (done) {
            const expected = read('test/expected/index-inlined-async-final.html');
            const cp = execFile('node', [
                this.bin,
                '--html',
                'test/fixtures/index.html',
                'test/fixtures/critical.css',
                '--no-minify'
            ]);

            let cnt = 0;
            cp.stdout.pipe(
                concat(data => {
                    cnt++;
                    expect(strip(data.toString('utf-8'))).to.be.equal(
                        strip(expected)
                    );
                })
            );

            cp.stdout.on('error', handleError);
            cp.on('close', () => {
                expect(cnt).to.equal(1);
                done();
            });
        });

        it('should work well with the critical CSS passed as option & html file passed as input', function (done) {
            const expected = read('test/expected/index-inlined-async-final.html');
            const cp = execFile('node', [
                this.bin,
                '--css',
                'test/fixtures/critical.css',
                'test/fixtures/index.html',
                '--no-minify'
            ]);

            let cnt = 0;
            cp.stdout.pipe(
                concat(data => {
                    cnt++;
                    expect(strip(data.toString('utf-8'))).to.be.equal(
                        strip(expected)
                    );
                })
            );

            cp.stdout.on('error', handleError);
            cp.on('close', () => {
                expect(cnt).to.equal(1);
                done();
            });
        });

        // Pipes don't work on windows
        it('should work well with the critical CSS file piped to inline-critical and html file as input',
            function (done) {
                const cp = exec(`${CAT} ${path.normalize('test/fixtures/critical.css')} | node ${this.bin} test/fixtures/index.html --no-minify`);
                const expected = read(
                    'test/expected/index-inlined-async-final.html'
                );

                let cnt = 0;
                cp.stdout.pipe(
                    concat(data => {
                        cnt++;
                        expect(strip(data.toString('utf-8'))).to.be.equal(
                            strip(expected)
                        );
                    })
                );

                cp.stdout.on('error', handleError);
                cp.on('close', () => {
                    expect(cnt).to.equal(1);
                    done();
                });
            }
        );

        it('should work well with the html file piped to inline-critical and critical CSS file as input',
            function (done) {
                const cp = exec(`${CAT} ${path.normalize('test/fixtures/index.html')} | node ${this.bin} test/fixtures/critical.css --no-minify`);
                const expected = read(
                    'test/expected/index-inlined-async-final.html'
                );

                let cnt = 0;
                cp.stdout.pipe(
                    concat(data => {
                        cnt++;
                        expect(strip(data.toString('utf-8'))).to.be.equal(
                            strip(expected)
                        );
                    })
                );

                cp.stdout.on('error', handleError);
                cp.on('close', () => {
                    expect(cnt).to.equal(1);
                    done();
                });
            }
        );

        it('should exit with code 1 and show help', function (done) {
            execFile('node', [this.bin, 'fixtures/not-exists.html'], (
                err,
                stdout,
                stderr
            ) => {
                expect(err).to.exist; // eslint-disable-line no-unused-expressions
                expect(err.code).equal(1);
                expect(stderr).to.have.string('Usage:');
                done();
            });
        });
    });

    describe('mocked', () => {
        beforeEach(function () {
            this.origArgv = process.argv;
            this.origExit = process.exit;
            this.stdout = process.stdout.write;
            this.stderr = process.stderr.write;

            mockery.enable({
                warnOnUnregistered: false,
                useCleanCache: true
            });

            mockery.registerMock(
                '.',
                (html, styles, options) => {
                    this.mockOpts = options;
                    this.mockOpts.html = html;
                    this.mockOpts.css = styles;
                    return '';
                }
            );
        });

        afterEach(function () {
            mockery.deregisterAll();
            mockery.disable();
            process.argv = this.origArgv;
            process.exit = this.origExit;
        });

        it('should pass the correct opts when using short opts', function (done) {
            process.argv = [
                'node',
                this.bin,
                '-c',
                'test/fixtures/critical.css',
                '-h',
                'test/fixtures/index.html',
                '-i',
                'ignore-me',
                '-i',
                '/regexp/',
                '-b',
                'basePath',
                '-s',
                'selector',
                '-m',
                '-e'
            ];

            process.stdout.write = () => {};
            process.stderr.write = () => {};
            require('../cli'); // eslint-disable-line import/no-unassigned-import

            // Timeout to wait for get-stdin timeout
            setTimeout(
                () => {
                    process.stdout.write = this.stdout;
                    process.stderr.write = this.stderr;
                    expect(this.mockOpts.css).to.equal(
                        read('test/fixtures/critical.css')
                    );
                    expect(this.mockOpts.html).to.equal(
                        read('test/fixtures/index.html')
                    );
                    expect(this.mockOpts.selector).to.equal('selector');
                    expect(this.mockOpts.ignore).to.be.instanceof(Array);
                    expect(this.mockOpts.ignore[0]).to.be.a('string');
                    expect(this.mockOpts.ignore[1]).to.instanceof(RegExp);
                    expect(this.mockOpts.minify).to.be.ok; // eslint-disable-line no-unused-expressions
                    expect(this.mockOpts.extract).to.be.ok; // eslint-disable-line no-unused-expressions
                    done();
                },
                200
            );
        });

        it('should pass the correct opts when using long opts', function (done) {
            process.argv = [
                'node',
                this.bin,
                '--css',
                'test/fixtures/critical.css',
                '--html',
                'test/fixtures/index.html',
                '--ignore',
                'ignore-me',
                '--ignore',
                '/regexp/',
                '--base',
                'basePath',
                '--selector',
                'selector',
                '--minify',
                '--extract'
            ];

            process.stdout.write = () => {};
            process.stderr.write = () => {};
            require('../cli'); // eslint-disable-line import/no-unassigned-import

            // Timeout to wait for get-stdin timeout
            setTimeout(
                () => {
                    process.stdout.write = this.stdout;
                    process.stderr.write = this.stderr;
                    expect(this.mockOpts.css).to.equal(
                        read('test/fixtures/critical.css')
                    );
                    expect(this.mockOpts.html).to.equal(
                        read('test/fixtures/index.html')
                    );
                    expect(this.mockOpts.selector).to.equal('selector');
                    expect(this.mockOpts.ignore).to.be.instanceof(Array);
                    expect(this.mockOpts.ignore[0]).to.be.a('string');
                    expect(this.mockOpts.ignore[1]).to.instanceof(RegExp);
                    expect(this.mockOpts.minify).to.be.ok; // eslint-disable-line no-unused-expressions
                    expect(this.mockOpts.extract).to.be.ok; // eslint-disable-line no-unused-expressions
                    done();
                },
                200
            );
        });
    });
});
