# gulp-sass-import-once

[Gulp](http://gulpjs.com/) plugin for [gulp-sass](https://github.com/dlmanning/gulp-sass) to remove duplicate imports.

# Install

```
npm install gulp-sass-import-once --save-dev
```

# Basic Usage

main.scss
```scss
@import "path/to/foo.scss";
@import "path/to/bar.scss";
```

foo.scss
```scss
.foo { background: red; }
```

bar.scss
```scss
@import "foo.scss";
.bar { background: blue; }
```

> **NOTE**: Also support using `'` (single quotes) for example: `@import 'path/to/foo.scss';`

gulpfile.js
```javascript
var gulp = require('gulp');
var sass = require('gulp-sass');
var sassImportOnce = require('gulp-sass-import-once');

gulp.task('styles', function () {
    return gulp
        .src('src/styles/main.scss')
        .pipe(sassImportOnce())
        .pipe(sass())
        .pipe(gulp.dest('dist/styles'));
});
```

dist/styles/main.css
```CSS
.foo { background: red; }
.bar { background: blue; }
```

# Additional import paths

You can optionally provide an array of paths to search for files to import.

```
gulp.task('styles', function () {
    return gulp
        .src('src/styles/main.scss')
          .pipe(sassImportOnce({
              importPaths: [
                  'node_modules',
                  'vendor'
              ]
          }))
        .pipe(sass())
        .pipe(gulp.dest('dist/styles'));
});
```
# Contribute

Issues and PRs are much appreciated.

## Run tests
```
npm test
```
## Build dist
```
npm run compile
```
