'use strict';

process.env.NODE_ENV = 'development';

process.on('unhandledRejection', err => {
  throw err;
});

const chalk = require('react-dev-utils/chalk');
const fs = require('fs-extra');
const gulp = require('../config/gulp');
const paths = require('../config/paths');

// Remove all content but keep the directory so that
// if you're in it, you don't end up in Trash
fs.emptyDirSync(paths.appBuild);
fs.emptyDirSync(paths.appBuildCjs);

gulp
  .build()
  .then(() => console.log(chalk.green('Compiled successfully.')))
  .catch(err => {
    console.log(chalk.red('Failed to compile.'));
    console.log();
    console.log(err.message || err);
    console.log();
  })
  .then(() => {
    gulp.watch(err => {
      if (err) {
        console.log(chalk.red('Failed to compile.'));
        console.log();
        console.log(err.message || err);
        console.log();
      } else {
        console.log(chalk.green('Compiled successfully.'));
      }
    });
  });
