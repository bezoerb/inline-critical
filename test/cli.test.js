/* eslint-env jest */
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPackageUp} from 'read-pkg-up';
import {jest} from '@jest/globals';
import {read, strip, run, getArgs, pipe} from './helper/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

jest.setTimeout(10000);

describe('acceptance', () => {
  test('Return version', async () => {
    const {packageJson} = await readPackageUp();
    const result = await run(['--version']);
    const {stdout, stderr, exitCode} = result || {};
    expect(stderr).toBeFalsy();
    expect(exitCode).toBe(0);
    expect(stdout).toBe(packageJson.version);
  });

  test('should work well with the critical CSS & html file passed as input', async () => {
    const expected = await read('expected/index-inlined-async-final-print.html');
    const {stdout, exitCode} = await run([
      'test/fixtures/index.html',
      'test/fixtures/critical.css',
      '--strategy',
      'media',
    ]);

    expect(exitCode).toBe(0);
    expect(strip(stdout)).toBe(strip(expected));
  });

  test('should work well with the critical CSS passed as input & html file passed as option', async () => {
    const expected = await read('expected/index-inlined-async-final.html');
    const {stdout, exitCode} = await run([
      '--html',
      'test/fixtures/index.html',
      'test/fixtures/critical.css',
      '--polyfill',
    ]);

    expect(exitCode).toBe(0);
    expect(strip(stdout)).toBe(strip(expected));
  });

  test('should work well with the critical CSS passed as input & html file passed as option', async () => {
    const expected = await read('expected/index-inlined-async-final.html');
    const {stdout, exitCode} = await run([
      '--html',
      'test/fixtures/index.html',
      'test/fixtures/critical.css',
      '--strategy',
      'polyfill',
    ]);

    expect(exitCode).toBe(0);
    expect(strip(stdout)).toBe(strip(expected));
  });

  test('should work well with the critical CSS passed as option & html file passed as input', async () => {
    const expected = await read('expected/index-inlined-async-final.html');
    const {stdout, exitCode} = await run([
      '--css',
      'test/fixtures/critical.css',
      'test/fixtures/index.html',
      '--polyfill',
    ]);

    expect(exitCode).toBe(0);
    expect(strip(stdout)).toBe(strip(expected));
  });

  test('Work well with the critical CSS file piped to inline-critical and html file as input', async () => {
    const expected = await read('expected/index-inlined-async-final-print.html');
    const result = await pipe('fixtures/critical.css', ['test/fixtures/index.html', '--strategy', 'media']);
    const {stdout, exitCode} = result || {};
    expect(exitCode).toBe(0);
    expect(strip(stdout)).toBe(strip(expected));
  });

  test('Work well with the html file piped to inline-critical and critical CSS file as input', async () => {
    const expected = await read('expected/index-inlined-async-final-print.html');
    const {stdout, exitCode} = await pipe('fixtures/index.html', ['test/fixtures/critical.css', '--strategy', 'media']);

    expect(exitCode).toBe(0);
    expect(strip(stdout)).toBe(strip(expected));
  });

  test('Exit with exitCode != 0 and show help', async () => {
    expect.assertions(2);
    try {
      await run(['fixtures/not-exists.html']);
    } catch (error) {
      expect(error.stderr).toMatch('Usage:');
      expect(error.exitCode).not.toBe(0);
    }
  });
});

describe('Mocked', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('Pass the correct opts when using short opts', async () => {
    const [html, css, args] = await getArgs([
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
      '-e',
      '-p',
    ]);

    const cssExpected = await read('fixtures/critical.css');
    const htmlExpected = await read('fixtures/index.html');
    expect(html).toBe(htmlExpected);
    expect(css).toBe(cssExpected);
    expect(args).toMatchObject({
      selector: 'selector',
      ignore: ['ignore-me', /regexp/],
      minify: true,
      extract: true,
      preload: true,
    });
  });

  test('should pass the correct opts when using long opts', async () => {
    const [html, css, args] = await getArgs([
      '--css',
      join(__dirname, 'fixtures/critical.css'),
      '--html',
      join(__dirname, 'fixtures/index.html'),
      '--ignore',
      'ignore-me',
      '--ignore',
      '/regexp/',
      '--base',
      'basePath',
      '--selector',
      'selector',
      '--minify',
      '--extract',
      '--preload',
      '--polyfill',
      '--noscript',
      'head',
      '--strategy',
      'body',
    ]);

    const cssExpected = await read('fixtures/critical.css');
    const htmlExpected = await read('fixtures/index.html');
    expect(html).toBe(htmlExpected);
    expect(css).toBe(cssExpected);
    expect(args).toMatchObject({
      selector: 'selector',
      ignore: ['ignore-me', /regexp/],
      minify: true,
      extract: true,
      preload: true,
      polyfill: true,
      noscript: 'head',
      strategy: 'body',
    });
  });
});
