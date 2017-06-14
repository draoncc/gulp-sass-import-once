'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.default = gulpSassImportOnce;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _gulpUtil = require('gulp-util');

var _gulpUtil2 = _interopRequireDefault(_gulpUtil);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var PLUGIN_NAME = 'gulp-sass-import-once';
var IMPORT_RE = /^([ \t]*(?:\/\*.*)?)@import\s+["']([^"']+(?:\.scss|\.sass)?)["'];?([ \t]*(?:\/[/*].*)?)$/gm;

function gulpSassImportOnce() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  return _through2.default.obj(function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    execute.apply(undefined, args.concat([options]));
  });
}

function execute(file, env, callback) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  var includePaths = options.includePaths ? options.includePaths.map(function (includePath) {
    return _path2.default.normalize(_path2.default.join(process.cwd(), includePath));
  }) : [];

  var _transform = transform(file.contents.toString('utf-8'), _path2.default.normalize(_path2.default.join(file.path), '/'), includePaths, callback),
      _transform2 = _slicedToArray(_transform, 1),
      newContents = _transform2[0];

  file.contents = new Buffer(newContents);

  callback(null, file);
}

function transform(contents, filename, includePaths, callback) {
  var imported = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : [];

  var searchBases = [_path2.default.dirname(filename)].concat(_toConsumableArray(includePaths));
  var lines = contents.split('\n').length;

  for (var line = 0; line < lines; line++) {
    var result = IMPORT_RE.exec(contents);

    if (result === null) {
      continue;
    }

    var _result = _slicedToArray(result, 4),
        fullMatch = _result[0],
        startComment = _result[1],
        importPath = _result[2],
        endComment = _result[3];

    var fullPath = void 0;
    var basePath = void 0;

    // Search for file in every base path
    for (var i = 0; i < searchBases.length; i++) {
      basePath = searchBases[i];

      var possibleMatches = void 0;

      if (/^(.+\/)?_?([^\.\n]+)\.css$/m.test(importPath)) {
        // CSS, therefore ignore
        continue;
      } else if (/^(.+\/)?_([^\.\n]+)\.(sass|scss)$/m.exec(importPath)) {
        // with underscore and with ext, therefore exact match
        possibleMatches = [importPath];
      } else if (/^(.+\/)?([^\.\n]+)\.(sass|scss)$/m.exec(importPath)) {
        // no underscore and with ext, therefore two variants - with or no underscore
        possibleMatches = [importPath, _path2.default.dirname(importPath) + '/_' + _path2.default.basename(importPath)];
      } else if (/^(.+\/)?_[^\.\n]+$/m.exec(importPath)) {
        // with underscore and no ext, therefore two variants - sass or scss
        possibleMatches = [importPath + '.sass', importPath + '.scss'];
      } else if (/^(.+\/)?([^\.\n]+)$/m.exec(importPath)) {
        // no underscore and no ext, therefore four variants - sass or scss with optional underscore
        possibleMatches = [importPath + '.sass', importPath + '.scss', _path2.default.dirname(importPath) + '/_' + _path2.default.basename(importPath) + '.sass', _path2.default.dirname(importPath) + '/_' + _path2.default.basename(importPath) + '.scss'];
      }

      var alreadyFound = void 0;

      for (var _i = 0; _i < possibleMatches.length; _i++) {
        fullPath = _path2.default.join(basePath, possibleMatches[_i]);

        if (fullPath === _path2.default.dirname(filename) || !_fs2.default.existsSync(fullPath) || _fs2.default.statSync(fullPath).isDirectory()) {
          continue;
        }

        // Already imported, remove rule and continue
        if (imported.indexOf(fullPath) > -1) {
          contents = contents.replace(fullMatch, startComment + '/* ' + fullMatch + ' */' + endComment);
          continue;
        }

        // The import is ambiguous and could refer to multiple files
        if (alreadyFound) {
          callback(new _gulpUtil2.default.PluginError(PLUGIN_NAME, 'Ambiguous import in ' + filename + ' on line ' + (line + 1) + '. This could refer to either ' + alreadyFound + ' or ' + possibleMatches[_i] + '.'));
        }

        alreadyFound = possibleMatches[_i];

        imported.push(fullPath);

        var _transform3 = transform(_fs2.default.readFileSync(fullPath, 'utf-8'), fullPath, includePaths, callback, imported),
            _transform4 = _slicedToArray(_transform3, 2),
            importContent = _transform4[0],
            importImports = _transform4[1];

        imported == importImports.reduce(function (coll, item) {
          coll.push(item);
          return coll;
        }, imported);

        contents = contents.replace(fullMatch + '\n', startComment + importContent + endComment);
      }
    }
  }

  return [contents, imported];
}
module.exports = exports['default'];