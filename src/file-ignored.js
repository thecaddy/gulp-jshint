var fs = require('fs');
var memoize = require('lodash.memoize');
var Minimatch = require('minimatch').Minimatch;
var resolve = require('path').resolve;
var relative = require('path').relative;
var RcLoader = require('rcloader');

var noSlashesRE = /^[^\/]*\/?$/;

var ignoreLoader = new RcLoader('.jshintignore', {}, {
  loader: function (path, done) {
    // .jshintignore is a line-delimited list of patterns
    // convert to an array and filter empty lines
    fs.readFile(path, function (err, contents) {
      if (err) return done(err);
      done(null, {
        patterns: contents.toString('utf8')
          .split(/\r?\n/)
          .filter(function (line) { return !!line.trim(); })
      });
    });
  }
});

var getMinimatch = memoize(function (pattern) {
  return new Minimatch(pattern, { nocase: true });
});

module.exports = function check(file, cb) {
  ignoreLoader.for(file.path, function (err, cfg) {
    var ignored = false;

    if (Array.isArray(cfg.patterns)) {
      ignored = cfg.patterns.some(function (pattern) {
        var resolvedPath = resolve(file.path);
        var mm = getMinimatch(pattern);

        if (resolvedPath === pattern) return true;
        if (mm.match(resolvedPath)) return true;

        if (noSlashesRE.test(pattern)) {
          var relPath = relative(pattern, file.base);
          if (relPath.substring(0, 2) !== '..') return true;
        }
      });
    }

    return cb(null, ignored);
  });
};