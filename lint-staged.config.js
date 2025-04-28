module.exports = {
  'src/**/*.{js,css,md}': [
    'eslint --fix',
    'prettier --write',
    'git add'
  ]
};
