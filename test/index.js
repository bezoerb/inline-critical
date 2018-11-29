"use strict";
var expect = require("chai").expect;
var reaver = require("reaver");
var fs = require("fs");
var path = require("path");
var exec = require("child_process").exec;
var execFile = require("child_process").execFile;
var readJson = require("read-package-json");
var mockery = require("mockery");
var concat = require("concat-stream");
var inlineCritical = require("..");

var skipWin = process.platform === "win32" ? it.skip : it;

function strip(string) {
    return string.replace(/[\r\n]+/gm, " ").replace(/\s+/gm, "");
}

function read(file) {
    return fs.readFileSync(file, "utf8");
}

describe("Module: inline-critical", function() {
    it("should inline css", function(done) {
        var html = read("test/fixtures/index.html");
        var css = read("test/fixtures/critical.css");

        var expected = read("test/expected/index-inlined-async-final.html");
        var out = inlineCritical(html, css, { minify: false });

        expect(strip(out.toString("utf-8"))).to.be.equal(strip(expected));

        done();
    });

    it("should inline in head if no stylesheets are there", function(done) {
        var html = read("test/fixtures/index-nostyle.html");
        var css = read("test/fixtures/critical.css");

        var expected = read("test/expected/index-nostyle.html");
        var out = inlineCritical(html, css, { minify: true });

        expect(strip(out.toString("utf-8"))).to.be.equal(strip(expected));

        done();
    });

    it("should inline absolute css", function(done) {
        var html = read("test/fixtures/index-absolute.html");
        var css = read("test/fixtures/critical.css");

        var expected = read("test/expected/index-inlined-absolute.html");
        var out = inlineCritical(html, css, { minify: false });

        expect(strip(out.toString("utf-8"))).to.be.equal(strip(expected));

        done();
    });

    it("should inline and minify css", function(done) {
        var html = read("test/fixtures/index.html");
        var css = read("test/fixtures/critical.css");

        var expected = read(
            "test/expected/index-inlined-async-minified-final.html"
        );
        var out = inlineCritical(html, css, { minify: true });

        expect(strip(out.toString("utf-8"))).to.be.equal(strip(expected));

        done();
    });

    it("should inline and extract css", function(done) {
        var html = read("test/fixtures/cartoon.html");
        var css = read("test/fixtures/critical.css");
        var expected = read("test/expected/cartoon-expected.css");
        var expectedHtml = read("test/expected/cartoon-expected.html");

        var out = inlineCritical(html, css, {
            minify: false,
            extract: true,
            basePath: "test/fixtures"
        });
        expect(
            fs.existsSync("test/fixtures/css/cartoon.18d89c7f.css")
        ).to.be.equal(true);
        expect(
            fs.existsSync(
                "test/fixtures/bower_components/bootstrap/dist/css/bootstrap.d561412a.css"
            )
        ).to.be.equal(true);
        expect(
            read(reaver.rev("test/fixtures/css/cartoon.css", expected))
        ).to.be.equal(expected);
        expect(strip(out.toString("utf-8"))).to.be.equal(strip(expectedHtml));

        fs.unlinkSync("test/fixtures/css/cartoon.18d89c7f.css");
        fs.unlinkSync(
            "test/fixtures/bower_components/bootstrap/dist/css/bootstrap.d561412a.css"
        );
        done();
    });

    it("should extract and minify css", function(done) {
        var html = read("test/fixtures/cartoon.html");
        var css = read("test/fixtures/critical.css");
        var expected = read("test/expected/cartoon-expected-minified.css");
        var expectedHtml = read("test/expected/cartoon-expected-minified.html");

        var out = inlineCritical(html, css, {
            minify: true,
            extract: true,
            basePath: "test/fixtures"
        });

        expect(
            fs.existsSync("test/fixtures/css/cartoon.c2b80bd6.css")
        ).to.be.equal(true);
        expect(
            fs.existsSync(
                "test/fixtures/bower_components/bootstrap/dist/css/bootstrap.fe278701.css"
            )
        ).to.be.equal(true);
        expect(
            read(reaver.rev("test/fixtures/css/cartoon.css", expected))
        ).to.be.equal(expected);
        expect(strip(out.toString("utf-8"))).to.be.equal(strip(expectedHtml));

        fs.unlinkSync("test/fixtures/css/cartoon.c2b80bd6.css");
        fs.unlinkSync(
            "test/fixtures/bower_components/bootstrap/dist/css/bootstrap.fe278701.css"
        );

        done();
    });

    it("should inline and extract css correctly with absolute paths", function(done) {
        var html = read("test/fixtures/cartoon-absolute.html");
        var css = read("test/fixtures/critical.css");
        var expected = read("test/expected/cartoon-expected.css");
        var expectedHtml = read("test/expected/cartoon-absolute-expected.html");

        var out = inlineCritical(html, css, {
            minify: false,
            extract: true,
            basePath: "test/fixtures"
        });

        expect(
            fs.existsSync("test/fixtures/css/cartoon.18d89c7f.css")
        ).to.be.equal(true);
        expect(
            fs.existsSync(
                "test/fixtures/bower_components/bootstrap/dist/css/bootstrap.d561412a.css"
            )
        ).to.be.equal(true);
        expect(
            read(reaver.rev("test/fixtures/css/cartoon.css", expected))
        ).to.be.equal(expected);
        expect(strip(out.toString("utf-8"))).to.be.equal(strip(expectedHtml));

        fs.unlinkSync("test/fixtures/css/cartoon.18d89c7f.css");
        fs.unlinkSync(
            "test/fixtures/bower_components/bootstrap/dist/css/bootstrap.d561412a.css"
        );

        done();
    });

    it("should not strip of svg closing tags", function(done) {
        var html = read("test/fixtures/entities.html");
        var out = inlineCritical(html, "", { minify: false });

        expect(strip(out.toString("utf-8"))).to.be.equal(strip(html));
        done();
    });

    it("should not strip of svg closing tags test 2", function(done) {
        var html = read("test/fixtures/svg.html");
        var expected = read("test/expected/test-svg.html");
        var css = "html{font-size:16;}";
        var out = inlineCritical(html, css, { minify: true });

        expect(strip(out.toString("utf-8"))).to.be.equal(strip(expected));
        done();
    });

    it("should not keep external urls", function(done) {
        function strip2(string) {
            return string.replace(/\s+/gm, "");
        }

        var html = read("test/fixtures/external.html");
        var expected = read("test/expected/external-expected.html");
        var css = read("test/fixtures/critical.css");
        var out = inlineCritical(html, css, { minify: false });

        expect(strip2(out.toString("utf-8"))).to.be.equal(strip2(expected));
        done();
    });

    it("should not keep external urls on extract", function(done) {
        function strip2(string) {
            return string.replace(/\s+/gm, "");
        }

        var html = read("test/fixtures/external.html");
        var expected = read("test/expected/external-extract-expected.html");
        var css = read("test/fixtures/critical.css");
        var out = inlineCritical(html, css, {
            minify: false,
            extract: true,
            basePath: "test/fixtures"
        });

        expect(strip2(out.toString("utf-8"))).to.be.equal(strip2(expected));
        done();
    });

    it("should keep self closing svg elements", function(done) {
        var html = read("test/fixtures/entities2.html");
        var out = inlineCritical(html, "", { minify: false });
        expect(strip(out.toString("utf-8"))).to.be.equal(strip(html));
        done();
    });

    it("should respect ignore option with string array", function(done) {
        function strip2(string) {
            return string.replace(/\s+/gm, "");
        }

        var html = read("test/fixtures/external.html");
        var expected = read("test/expected/external-ignore-expected.html");
        var css = read("test/fixtures/critical.css");
        var out = inlineCritical(html, css, {
            minify: false,
            ignore: ["bower_components/bootstrap/dist/css/bootstrap.css"]
        });

        expect(strip2(out.toString("utf-8"))).to.be.equal(strip2(expected));
        done();
    });

    it("should respect single ignore option with string", function(done) {
        function strip2(string) {
            return string.replace(/\s+/gm, "");
        }

        var html = read("test/fixtures/external.html");
        var expected = read("test/expected/external-ignore-expected.html");
        var css = read("test/fixtures/critical.css");
        var out = inlineCritical(html, css, {
            minify: false,
            ignore: "bower_components/bootstrap/dist/css/bootstrap.css"
        });

        expect(strip2(out.toString("utf-8"))).to.be.equal(strip2(expected));
        done();
    });

    it("should respect ignore option with RegExp array", function(done) {
        function strip2(string) {
            return string.replace(/\s+/gm, "");
        }

        var html = read("test/fixtures/external.html");
        var expected = read("test/expected/external-ignore-expected.html");
        var css = read("test/fixtures/critical.css");
        var out = inlineCritical(html, css, {
            minify: false,
            ignore: [/bootstrap/]
        });

        expect(strip2(out.toString("utf-8"))).to.be.equal(strip2(expected));
        done();
    });

    it("should respect selector option", function(done) {
        var html = read("test/fixtures/index.html");
        var css = read("test/fixtures/critical.css");

        var expected = read("test/expected/index-before.html");
        var out = inlineCritical(html, css, {
            minify: true,
            selector: "title"
        });

        expect(strip(out.toString("utf-8"))).to.be.equal(strip(expected));
        done();
    });

    it("should ignore stylesheets wrapped in noscript", function(done) {
        var html = read("test/fixtures/index-noscript.html");
        var css = read("test/fixtures/critical.css");

        var expected = read(
            "test/expected/index-noscript-inlined-minified-final.html"
        );
        var out = inlineCritical(html, css, { minify: true });

        expect(strip(out.toString("utf-8"))).to.be.equal(strip(expected));
        done();
    });

    it("should skip loadcss if it's already present and used for all existing link tags", function(done) {
        var html = read("test/fixtures/loadcss.html");
        var css = read("test/fixtures/critical.css");

        var expected = read("test/expected/index-loadcss.html");
        var out = inlineCritical(html, css, { minify: true });

        expect(strip(out.toString("utf-8"))).to.be.equal(strip(expected));
        done();
    });
});

describe("CLI", function() {
    beforeEach(function(done) {
        readJson(
            path.join(__dirname, "../", "package.json"),
            function(err, data) {
                expect(err).to.not.exist;
                this.pkg = data;
                this.bin = path.join(
                    __dirname,
                    "../",
                    data.bin["inline-critical"]
                );
                done();
            }.bind(this)
        );
    });

    function handleError(err) {
        expect(err).to.equal(null);
        process.exit(1);
    }

    describe("acceptance", function() {
        // empty stdout on appveyor? runs correct on manual test with Windows 7
        skipWin("should return the version", function(done) {
            execFile(
                "node",
                [this.bin, "--version"],
                function(error, stdout) {
                    expect(stdout.replace(/\r\n|\n/g, "")).to.equal(
                        this.pkg.version
                    );
                    done();
                }.bind(this)
            );
        });

        it("should work well with the critical CSS & html file passed as input", function(done) {
            var expected = read("test/expected/index-inlined-async-final.html");
            var cp = execFile("node", [
                this.bin,
                "test/fixtures/index.html",
                "test/fixtures/critical.css",
                "--no-minify"
            ]);

            var cnt = 0;
            cp.stdout.pipe(
                concat(function(data) {
                    cnt++;
                    expect(strip(data.toString("utf-8"))).to.be.equal(
                        strip(expected)
                    );
                })
            );

            cp.stdout.on("error", handleError);
            cp.on("close", function() {
                expect(cnt).to.equal(1);
                done();
            });
        });

        it("should work well with the critical CSS passed as input & html file passed as option", function(done) {
            var expected = read("test/expected/index-inlined-async-final.html");
            var cp = execFile("node", [
                this.bin,
                "--html",
                "test/fixtures/index.html",
                "test/fixtures/critical.css",
                "--no-minify"
            ]);

            var cnt = 0;
            cp.stdout.pipe(
                concat(function(data) {
                    cnt++;
                    expect(strip(data.toString("utf-8"))).to.be.equal(
                        strip(expected)
                    );
                })
            );

            cp.stdout.on("error", handleError);
            cp.on("close", function() {
                expect(cnt).to.equal(1);
                done();
            });
        });

        it("should work well with the critical CSS passed as option & html file passed as input", function(done) {
            var expected = read("test/expected/index-inlined-async-final.html");
            var cp = execFile("node", [
                this.bin,
                "--css",
                "test/fixtures/critical.css",
                "test/fixtures/index.html",
                "--no-minify"
            ]);

            var cnt = 0;
            cp.stdout.pipe(
                concat(function(data) {
                    cnt++;
                    expect(strip(data.toString("utf-8"))).to.be.equal(
                        strip(expected)
                    );
                })
            );

            cp.stdout.on("error", handleError);
            cp.on("close", function() {
                expect(cnt).to.equal(1);
                done();
            });
        });

        // pipes don't work on windows
        skipWin(
            "should work well with the critical CSS file piped to inline-critical and html file as input",
            function(done) {
                var cp = exec(
                    "cat test/fixtures/critical.css | node " +
                        this.bin +
                        " test/fixtures/index.html --no-minify"
                );
                var expected = read(
                    "test/expected/index-inlined-async-final.html"
                );

                var cnt = 0;
                cp.stdout.pipe(
                    concat(function(data) {
                        cnt++;
                        expect(strip(data.toString("utf-8"))).to.be.equal(
                            strip(expected)
                        );
                    })
                );

                cp.stdout.on("error", handleError);
                cp.on("close", function() {
                    expect(cnt).to.equal(1);
                    done();
                });
            }
        );

        skipWin(
            "should work well with the html file piped to inline-critical and critical CSS file as input",
            function(done) {
                var cp = exec(
                    "cat test/fixtures/index.html | node " +
                        this.bin +
                        " test/fixtures/critical.css --no-minify"
                );
                var expected = read(
                    "test/expected/index-inlined-async-final.html"
                );

                var cnt = 0;
                cp.stdout.pipe(
                    concat(function(data) {
                        cnt++;
                        expect(strip(data.toString("utf-8"))).to.be.equal(
                            strip(expected)
                        );
                    })
                );

                cp.stdout.on("error", handleError);
                cp.on("close", function() {
                    expect(cnt).to.equal(1);
                    done();
                });
            }
        );

        it("should exit with code 1 and show help", function(done) {
            execFile("node", [this.bin, "fixtures/not-exists.html"], function(
                err,
                stdout,
                stderr
            ) {
                expect(err).to.exist;
                expect(err.code).equal(1);
                expect(stderr).to.have.string("Usage:");
                done();
            });
        });
    });

    describe("mocked", function() {
        beforeEach(function() {
            this.origArgv = process.argv;
            this.origExit = process.exit;
            this.stdout = process.stdout.write;
            this.stderr = process.stderr.write;

            mockery.enable({
                warnOnUnregistered: false,
                useCleanCache: true
            });

            mockery.registerMock(
                ".",
                function(html, styles, options) {
                    this.mockOpts = options;
                    this.mockOpts.html = html;
                    this.mockOpts.css = styles;
                    return "";
                }.bind(this)
            );
        });

        afterEach(function() {
            mockery.deregisterAll();
            mockery.disable();
            process.argv = this.origArgv;
            process.exit = this.origExit;
        });

        it("should pass the correct opts when using short opts", function(done) {
            process.argv = [
                "node",
                this.bin,
                "-c",
                "test/fixtures/critical.css",
                "-h",
                "test/fixtures/index.html",
                "-i",
                "ignore-me",
                "-i",
                "/regexp/",
                "-b",
                "basePath",
                "-s",
                "selector",
                "-m",
                "-e"
            ];

            process.stdout.write = function() {};
            process.stderr.write = function() {};
            require("../cli");

            // timeout to wait for get-stdin timeout
            setTimeout(
                function() {
                    process.stdout.write = this.stdout;
                    process.stderr.write = this.stderr;
                    expect(this.mockOpts.css).to.equal(
                        read("test/fixtures/critical.css")
                    );
                    expect(this.mockOpts.html).to.equal(
                        read("test/fixtures/index.html")
                    );
                    expect(this.mockOpts.selector).to.equal("selector");
                    expect(this.mockOpts.ignore).to.be.instanceof(Array);
                    expect(this.mockOpts.ignore[0]).to.be.a("string");
                    expect(this.mockOpts.ignore[1]).to.instanceof(RegExp);
                    expect(this.mockOpts.minify).to.be.ok;
                    expect(this.mockOpts.extract).to.be.ok;
                    done();
                }.bind(this),
                200
            );
        });

        it("should pass the correct opts when using long opts", function(done) {
            process.argv = [
                "node",
                this.bin,
                "--css",
                "test/fixtures/critical.css",
                "--html",
                "test/fixtures/index.html",
                "--ignore",
                "ignore-me",
                "--ignore",
                "/regexp/",
                "--base",
                "basePath",
                "--selector",
                "selector",
                "--minify",
                "--extract"
            ];

            process.stdout.write = function() {};
            process.stderr.write = function() {};
            require("../cli");

            // timeout to wait for get-stdin timeout
            setTimeout(
                function() {
                    process.stdout.write = this.stdout;
                    process.stderr.write = this.stderr;
                    expect(this.mockOpts.css).to.equal(
                        read("test/fixtures/critical.css")
                    );
                    expect(this.mockOpts.html).to.equal(
                        read("test/fixtures/index.html")
                    );
                    expect(this.mockOpts.selector).to.equal("selector");
                    expect(this.mockOpts.ignore).to.be.instanceof(Array);
                    expect(this.mockOpts.ignore[0]).to.be.a("string");
                    expect(this.mockOpts.ignore[1]).to.instanceof(RegExp);
                    expect(this.mockOpts.minify).to.be.ok;
                    expect(this.mockOpts.extract).to.be.ok;
                    done();
                }.bind(this),
                200
            );
        });
    });
});
