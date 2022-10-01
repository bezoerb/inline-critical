/* eslint-env jest */
import {isAbsolute, join, normalize} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import fsExtra from 'fs-extra';
import {readPackageUp} from 'read-pkg-up';
import {execa} from 'execa';
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

export const strip = (string) => nn(string.replace(/[\r\n]+/gm, ' ').replace(/\s+/gm, ''));

export const getBin = async () => {
  const {packageJson} = await readPackageUp();
  return join(__dirname, '../../', packageJson.bin['inline-critical']);
};

export const run = async (args = []) => {
  const bin = await getBin();
  return execa('node', [bin, ...args]);
};

export const pipe = async (file, args = []) => {
  const filepath = isAbsolute(file) ? file : join(__dirname, '..', file);
  const cat = process.platform === 'win32' ? 'type' : 'cat';
  const bin = await getBin();
  const cmd = `${cat} ${normalize(filepath)} | node ${bin} ${args.join(' ')}`;
  return execa(cmd, {shell: true});
};
