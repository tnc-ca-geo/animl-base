module.exports = {
  env: {
    browser: false,
    node: true,
    es6: true,
  },
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  extends: ['plugin:prettier/recommended'],
};
