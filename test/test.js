import path from 'path';
import expect from 'expect.js';
import vinyl from 'vinyl-fs';
import sassImportOnce from '../src';
import gutil from 'gulp-util';

describe('gulp-sass-import-once', () => {
  it('(scss) should remove duplicate imports on one file', (done) => {
    const expectedResult = [
      'foo',
      '/* @import \'import/f1\'; */',
    ].join('\n');

    vinyl
            .src(path.join(__dirname, '/test-scss/simple.scss'))
            .pipe(sassImportOnce())
            .on('data', (file) => {
              const contents = file.contents.toString('utf-8').trim();
              expect(contents).to.equal(expectedResult.trim());
            })
            .on('end', done);
  });

  it('(scss) should remove imports accross imported files', (done) => {
    const expectedResult = [
      'foo',
      '/* @import \'f1\'; */',
      '',
      'bar',
    ].join('\n');

    vinyl
            .src(path.join(__dirname, '/test-scss/nested.scss'))
            .pipe(sassImportOnce())
            .on('data', (file) => {
              const contents = file.contents.toString('utf-8').trim();
              expect(contents).to.equal(expectedResult.trim());
            })
            .on('end', done);
  });

  it('(scss) should throw an error due to ambiguous imports', (done) => {
    const expectedResult = [
      'Ambiguous import in ' + __dirname + '/test-scss/error.scss on line 1. This ',
      'could refer to either import/ambiguous.scss or import/_ambiguous.scss.',
    ].join('');

    vinyl
            .src(path.join(__dirname, '/test-scss/error.scss'))
            .pipe(sassImportOnce())
            .on('error', (e) => {
              expect(e).to.be.a(gutil.PluginError);
              expect(e.message).to.equal(expectedResult);
              done();
            });
  });

  it('(scss) should be able to import with includePaths option', (done) => {
    const expectedResult = [
      'foo',
    ].join('');

    vinyl
            .src(path.join(__dirname, '/test-scss/includePaths.scss'))
            .pipe(sassImportOnce({
              includePaths: [
                'test/test-scss/import',
              ],
            }))
            .on('data', (file) => {
              const contents = file.contents.toString('utf-8').trim();
              expect(contents).to.equal(expectedResult.trim());
            })
            .on('end', done);
  });

  it('(scss) should be able to import files with names that contain dots', (done) => {
    const expectedResult = [
      'lib.plugin',
    ].join('');

    vinyl
            .src(path.join(__dirname, '/test-scss/dottedFiles.scss'))
            .pipe(sassImportOnce())
            .on('data', (file) => {
              const contents = file.contents.toString('utf-8').trim();
              expect(contents).to.equal(expectedResult.trim());
            })
            .on('end', done);
  });
});
