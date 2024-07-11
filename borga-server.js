"use strict";

const session = require("express-session");
const passport = require("passport");
const express = require("express");

passport.serializeUser((userInfo, done) => {
  done(null, userInfo);
});
passport.deserializeUser((userInfo, done) => {
  done(null, userInfo);
});

module.exports = function (es_spec) {
  const data_ext = require("./borga-data-ext-games");
  //const data_int = require('./borga-data-int-mem.js');
  const data_int = require("./borga-data-int-elastic.js")(es_spec);

  const services = require("./borga-services")(data_ext, data_int);

  const webapi = require("./borga-webapi")(services);
  const webui = require("./borga-webui")(services);

  const app = express();

  app.use(
    session({
      secret: "isel-ipw",
      resave: false,
      saveUninitialized: false,
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());

  app.use("/api", webapi);
  app.use("/", webui);

  app.set("view engine", "hbs");

  app.use("/favicon.ico", express.static("static-files/favicon.ico"));
  app.use("/public", express.static("static-files"));

  return app;
};
