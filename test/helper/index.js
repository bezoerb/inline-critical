/* eslint-env jest */
import {isAbsolute, join, normalize} from 'node:path';
import {exec, execFile} from 'node:child_process';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import fsExtra from 'fs-extra';
import {readPackageUp} from 'read-pkg-up';
import nn from 'normalize-newline';

const {removeSync} = fsExtra;
const __dirname = fileURLToPath(new URL('.', import.meta.url));

export const read = async (file) => {
  const filepath = isAbsolute(file) ? file : join(__dirname, '..', file);
  const content = await readFile(filepath, 'utf8');
  return nn(content);
};

export const checkAndDelete = (file) => {
  const filepath = isAbsolute(file) ? file : join(__dirname, '..', file);
  if (existsSync(filepath)) {
    removeSync(filepath);
    return true;
  }
};

export const strip = (string) => nn(string.replaceAll(/[\r\n]+/gm, ' ').replaceAll(/\s+/gm, ''));

export const getBinary = async () => {
  const {packageJson} = await readPackageUp();
  return join(__dirname, '../../', packageJson.bin['inline-critical']);
};

const pExec = promisify(exec);
const pExecFile = promisify(execFile);

export const run = async (arguments_ = []) => {
  const binary = await getBinary();

  const {stderr, stdout} = await pExecFile('node', [binary, ...arguments_]);
  return {stderr, stdout: stdout?.trim(), code: 0};
};

export const pipe = async (file, arguments_ = []) => {
  const filename = isAbsolute(file) ? file : join(__dirname, '..', file);
  const binary = await getBinary();
  const cat = process.platform === 'win32' ? 'type' : 'cat';
  const cmd = `${cat} ${normalize(filename)} | node ${binary} ${arguments_.join(' ')}`;

  const {stderr, stdout} = await pExec(cmd, {shell: true});
  return {stderr, stdout: stdout?.trim(), code: 0};
};
