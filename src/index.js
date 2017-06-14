import path from 'path';
import fs from 'fs';
import through from 'through2';
import gutil from 'gulp-util';
import readline from 'readline';
import streamifier from 'streamifier';
import streamToBuffer from 'stream-to-buffer';

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

  const contents = streamifier.createReadStream(file.contents);
  const imports = [];
  const newContents = through();

  traceFile(
    contents,
    path.normalize(path.join(file.path), '/'),
    newContents,
    imports,
    includePaths,
    (err = null) => {
      if (err !== null) {
        callback(err);
      }

      newContents.end();
    },
    0
  );

  streamToBuffer(newContents, (err, buffer) => {
    file.contents = buffer;
    callback(null, file);
  });
}

function traceFile(contents, filename, dest, imports, includePaths, callback, depth) {
  let __lock = 0;
  const __lockFn = [];
  const __lockArgs = [];
  const __lockObj = [];

  function lock_() {
    __lock++;
  }

  function release_() {
    __lock--;
    if (__lock <= 0) {
      __lock = 0;
      while (__lockFn.length) {
        __lockFn.shift().call(__lockObj.shift(), ...__lockArgs.shift());
      }
    }
  }

  function fn_(obj, fn, ...args) {
    if (__lock) {
      __lockObj.push(obj);
      __lockFn.push(fn);
      __lockArgs.push(args || []);
    } else {
      fn.call(obj, ...args);
    }
  }

  const searchBases = [path.dirname(filename), ...includePaths];
  const lineReader = readline.createInterface({
    input: contents,
  });

  contents.on('end', () => {
    lineReader.close();
    fn_(null, callback);
  });

  let lineNum = 0;
  lineReader.on('line', (line) => {
    lineNum++;

    const result = IMPORT_RE.exec(line);
    IMPORT_RE.lastIndex = 0;

    if (result === null) {
      fn_(dest, dest.write, line + '\n');
      return;
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
        if (imports.indexOf(fullPath) > -1) {
          fn_(dest, dest.write, startComment + '/* ' + fullMatch + ' */' + endComment + '\n');
          continue;
        }

        // The import is ambiguous and could refer to multiple files
        if (alreadyFound) {
          callback(new gutil.PluginError(PLUGIN_NAME,
            `Ambiguous import in ${filename} on line ${lineNum}. This could refer to either ${alreadyFound} or ${possibleMatches[i]}.`
          ));
        }

        alreadyFound = possibleMatches[i];

        imports.push(fullPath);

        lock_();

        traceFile(
          fs.createReadStream(fullPath),
          fullPath,
          dest,
          imports,
          includePaths,
          (err = null) => {
            if (err !== null) {
              callback(err);
            }

            release_();
          },
          depth + 1
        );
      }
    }
  });
}
