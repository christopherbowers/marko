var marko_template = module.exports = require("marko/vdom").t();

function render(input, out) {
  var data = input;

  out.t("Hello ");

  out.t(name);

  out.t("! ");

  out.h(message);
}

marko_template._ = render;
