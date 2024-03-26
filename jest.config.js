const config = {
  coverageProvider: 'v8',
  coverageReporters: ['html', 'lcov', 'text'],
  collectCoverageFrom: ['cli.js', 'index.js', 'src/*.js', '!**/node_modules/**'],
  roots: [''],
};

export default config;
