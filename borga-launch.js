"use strict";

const port = process.env.PORT || 8888;

const config = require("./borga-config");

const es_spec = {
  url: config.devl_es_url,
  prefix: "prod",
};

const app = require("./borga-server")(es_spec, config.guest);

app.listen(port);
