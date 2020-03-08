'use strict';

const chalk = require('react-dev-utils/chalk');
const gulp = require('gulp');
const babel = require('gulp-babel');
const changedInPlace = require('gulp-changed-in-place');
const clone = require('gulp-clone');
const plumber = require('gulp-plumber');
const sourcemaps = require('gulp-sourcemaps');
const ts = require('gulp-typescript');
const merge = require('merge2');
const path = require('path');

const appPaths = require('./paths');

const typescript = (() => {
  try {
    return require(path.join(appPaths.appNodeModules, 'typescript'));
  } catch (_) {
    return require('typescript');
  }
})();

const src = appPaths.appSrc;
const outDir = appPaths.appBuild;

const tsPaths = [
  `${src}/**/*.ts`,
  `${src}/**/*.tsx`,
  `${appPaths.appTypings}/**/*.d.ts`,
];

const jsPaths = [`${src}/**/*.js`, `${src}/**/*.jsx`];

const baseCompilerOptions = {
  module: 'esnext',
  target: 'es2015',
  outDir,
  rootDir: '.',
  skipLibCheck: true,
  forceConsistentCasingInFileNames: true,
  jsx: 'preserve',
  sourceMap: true,
  moduleResolution: 'node',
  typescript: typescript,
};

let tsProject;

function build() {
  console.log(chalk.green(`Using typescript@${typescript.version}`));
  return buildTs();
}

function buildTs() {
  const appTsConfig = require(appPaths.appTsConfig);
  return new Promise((resolve, reject) => {
    function errorHandler(e) {
      reject(e);
      this.emit('end');
    }
    const tsStream = gulp
      .src(
        appTsConfig.compilerOptions.allowJs ? tsPaths.concat(jsPaths) : tsPaths
      )
      .pipe(plumber())
      .pipe(changedInPlace({ firstPass: true }))
      .pipe(sourcemaps.init())
      .pipe(
        (tsProject ||
          (tsProject = ts.createProject(
            Object.assign({}, baseCompilerOptions, appTsConfig.compilerOptions)
          )))()
      );

    const babelPipe = tsStream.js
      .pipe(
        babel({
          babelrc: false,
          filename: path,
          presets: [
            [
              require.resolve('babel-preset-react-app'),
              {
                useESModules: true,
                absoluteRuntime: false,
              },
            ],
          ],
          plugins: [
            require.resolve('babel-plugin-annotate-pure-calls')
          ],
        })
      )
      .pipe(sourcemaps.write('.'))
      .on('error', errorHandler);

    const primaryStream = merge([
      babelPipe,
      tsStream.dts,
    ]).pipe(gulp.dest(outDir));

    const primaryPromise = new Promise((resolve, reject) => {
      primaryStream.on('end', resolve);
      primaryStream.on('error', reject);
    });

    const cjsPromise = new Promise((resolve, reject) => {
      const cjsStream = merge([
        tsStream.js
          .pipe(clone())
          .pipe(
            babel({
              babelrc: false,
              filename: path,
              presets: [
                [
                  require.resolve('babel-preset-react-app'),
                  {
                    useESModules: false,
                    absoluteRuntime: false,
                  },
                ],
              ],
              plugins: [
                require.resolve('babel-plugin-annotate-pure-calls'),
                require.resolve('babel-plugin-dynamic-import-node'),
                require.resolve(
                  '@babel/plugin-transform-modules-commonjs'
                ),
              ],
            })
          )
          .pipe(sourcemaps.write('.')),
        tsStream.dts.pipe(clone()),
      ]).pipe(gulp.dest(appPaths.appBuildCjs));

      cjsStream.on('end', resolve);
      cjsStream.on('error', reject);
    });

    return Promise.all([primaryPromise, cjsPromise]).then(resolve, reject);
  });
}

function watch(cb) {
  const appTsConfig = require(appPaths.appTsConfig);
  gulp.watch(
    appTsConfig.compilerOptions.allowJs ? tsPaths.concat(jsPaths) : tsPaths,
    () => {
      console.info(chalk.blue('changes detected, rebuilding...'));
      return buildTs()
        .then(() => cb())
        .catch(err => cb(err || true));
    }
  );
}

module.exports.build = build;
module.exports.watch = watch;
