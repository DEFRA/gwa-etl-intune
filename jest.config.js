module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    './**/*.js',
    '!**/coverage/**',
    '!jest.config.js'
  ],
  transformIgnorePatterns: [
  ],
  setupFiles: ['./jest.setup.js']
}
