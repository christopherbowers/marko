var marko_template = module.exports = require("marko/html").t(__filename);

function render(input, out) {
  var data = input;

  out.w("<div></div>");
}

marko_template._ = render;

marko_template.meta = {
    deps: [
      {
          type: "css",
          code: ".foo{}",
          virtualPath: "./index.marko.css",
          path: "./index.marko"
        }
    ]
  };
