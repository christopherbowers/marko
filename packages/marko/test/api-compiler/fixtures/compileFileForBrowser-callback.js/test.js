var path = require("path");

exports.check = function (marko, markoCompiler, expect, snapshot, done) {
  var compiler = require("marko/compiler");
  var templatePath = path.join(__dirname, "template.marko");

  compiler.compileFileForBrowser(
    templatePath,
    {
      writeVersionComment: false,
    },
    function (err, compiledTemplate) {
      if (err) {
        return done(err);
      }
      var code = compiledTemplate.code;
      code = code.replace(/marko\/dist\//g, "marko/src/");

      try {
        snapshot(code, ".js");
        done();
      } catch (err) {
        done(err);
      }
    }
  );
};
