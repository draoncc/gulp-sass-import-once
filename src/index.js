import path from 'path';
import fs from 'fs';
import through from 'through2';
import gutil from 'gulp-util';

const PLUGIN_NAME = 'gulp-sass-import-once';
const IMPORT_RE = /^([ \t]*(?:\/\*.*)?)@import\s+["']([^"']+(?:\.scss|\.sass)?)["'];?([ \t]*(?:\/[/*].*)?)$/gm;

export default function gulpSassImportOnce(options = {}) {
  return through.obj((...args) => {
    execute(...args, options);
  });
}

function execute(file, env, callback, options = {}) {
  const includePaths = options.includePaths ?
    options.includePaths.map((includePath) =>
      path.normalize(path.join(process.cwd(), includePath))
    ) :
    [];

  const [newContents] = transform(
    file.contents.toString('utf-8'),
    path.normalize(path.join(file.path), '/'),
    includePaths,
    callback
  );

  file.contents = new Buffer(newContents);

  callback(null, file);
}

function transform(contents, filename, includePaths, callback, imported = []) {
  const searchBases = [path.dirname(filename), ...includePaths];
  const lines = contents.split('\n').length;

  for (let line = 0; line < lines; line++) {
    const result = IMPORT_RE.exec(contents);

    if (result === null) {
      continue;
    }

    const [fullMatch, startComment, importPath, endComment] = result;

    let fullPath;
    let basePath;

    // Search for file in every base path
    for (let i = 0; i < searchBases.length; i++) {
      basePath = searchBases[i];

      let possibleMatches;

      if (/^(.+\/)?_?([^\.\n]+)\.css$/m.test(importPath)) {
        // CSS, therefore ignore
        continue;
      } else if (/^(.+\/)?_([^\.\n]+)\.(sass|scss)$/m.exec(importPath)) {
        // with underscore and with ext, therefore exact match
        possibleMatches = [
          importPath,
        ];
      } else if (/^(.+\/)?([^\.\n]+)\.(sass|scss)$/m.exec(importPath)) {
        // no underscore and with ext, therefore two variants - with or no underscore
        possibleMatches = [
          importPath,
          path.dirname(importPath) + '/_' + path.basename(importPath),
        ];
      } else if (/^(.+\/)?_[^\.\n]+$/m.exec(importPath)) {
        // with underscore and no ext, therefore two variants - sass or scss
        possibleMatches = [
          importPath + '.sass',
          importPath + '.scss',
        ];
      } else if (/^(.+\/)?([^\.\n]+)$/m.exec(importPath)) {
        // no underscore and no ext, therefore four variants - sass or scss with optional underscore
        possibleMatches = [
          importPath + '.sass',
          importPath + '.scss',
          path.dirname(importPath) + '/_' + path.basename(importPath) + '.sass',
          path.dirname(importPath) + '/_' + path.basename(importPath) + '.scss',
        ];
      }

      let alreadyFound;

      for (let i = 0; i < possibleMatches.length; i++) {
        fullPath = path.join(basePath, possibleMatches[i]);

        if (fullPath === path.dirname(filename)
          || !fs.existsSync(fullPath)
          || fs.statSync(fullPath).isDirectory()
        ) {
          continue;
        }

        // Already imported, remove rule and continue
        if (imported.indexOf(fullPath) > -1) {
          contents = contents.replace(
            fullMatch,
            startComment + '/* ' + fullMatch + ' */' + endComment
          );
          continue;
        }

        // The import is ambiguous and could refer to multiple files
        if (alreadyFound) {
          callback(new gutil.PluginError(PLUGIN_NAME,
            `Ambiguous import in ${filename} on line ${line + 1}. This could refer to either ${alreadyFound} or ${possibleMatches[i]}.`
          ));
        }

        alreadyFound = possibleMatches[i];

        imported.push(fullPath);

        const [importContent, importImports] = transform(
          fs.readFileSync(fullPath, 'utf-8'),
          fullPath,
          includePaths,
          callback,
          imported
        );

        imported == importImports.reduce((coll, item) => {
          coll.push(item);
          return coll;
        }, imported);

        contents = contents.replace(fullMatch + '\n', startComment + importContent + endComment);
      }
    }
  }

  return [contents, imported];
}
