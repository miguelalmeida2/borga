"use strict";

const express = require("express");
const errors = require("./borga-errors");
const friendlyHttpStatus = require("./friendly-http-status.json");

function getUsername(req) {
  return req.user && req.user.username;
}

function getHttpErrorCode(err) {
  switch (err.name) {
    case "FAILURE":
      return 500;
    case "NOT_FOUND":
      return 404;
    case "EXT_SVC_FAILURE":
      return 503;
    case "ALREADY_EXISTS":
      return 409;
    case "MISSING_PARAM":
      return 400;
    case "INVALID_PARAM":
      return 400;
    case "UNAUTHENTICATED":
      return 401;
    default:
      return 500;
  }
}

module.exports = function (services) {
  async function getHomepage(req, res) {
    const username = getUsername(req);
    try {
      const result = await services.getMostPopularGames();
      res.render("home", {
        active: { home: true },
        username,
        games: result.games,
      });
    } catch (err) {
      res.render("home", {
        active: { home: true },
        username,
      });
    }
  }

  async function getLoginPage(req, res) {
    const args = {
      active: { login: true },
    };
    if (req.query.error) {
      switch (req.query.error) {
        case "username":
        case "password":
          // For security reasons we don't let the user know
          // that the username exists
          args.error = "Incorrect username or password";
          break;
        case "missing":
          args.error = "Please fill out both fields";
          break;
        default:
          args.error = req.query.error;
      }
    }
    res.render("login", args);
  }

  async function getSignupPage(req, res) {
    const args = {
      active: { signup: true },
    };
    if (req.query.error) {
      switch (req.query.error) {
        case "missing":
          args.error = "Please fill out all fields";
          break;
        case "conflict":
          args.error = "Username is already taken";
          break;
        default:
          args.error = req.query.error;
      }
    }
    res.render("signup", args);
  }

  async function doLogin(req, res) {
    const username = req.body.username;
    const password = req.body.password;
    try {
      const user = await services.checkAndGetUser(username, password);
      req.login({ username: user.username, token: user.token }, (err) => {
        if (err) {
          throw errors.FAILURE("Failed to login");
        }
        res.redirect("/my");
      });
    } catch (err) {
      let error;
      switch (err.name) {
        case "NOT_FOUND":
          error = "username";
          break;
        case "MISSING_PARAM":
          error = "missing";
          break;
        case "INVALID_PARAM":
          error = "password";
          break;
        default:
          getErrorPage(req, res, err);
          return;
      }
      res.redirect(`/login?error=${error}`);
    }
  }

  async function doSignup(req, res) {
    const name = req.body.name;
    const username = req.body.username;
    const password = req.body.password;
    try {
      if (!(name && username && password)) {
        res.redirect(`/signup?error=missing`);
        return;
      }
      // data-int should check if name and password are valid
      await services.createUser(name, username, password);
      await doLogin(req, res);
    } catch (err) {
      if (err.name === "ALREADY_EXISTS") {
        res.redirect(`/signup?error=conflict`);
        return;
      } else {
        getErrorPage(req, res, err);
      }
    }
  }

  function doLogout(req, res) {
    req.logout();
    res.redirect("/login");
  }

  async function getSearchPage(req, res) {
    const username = getUsername(req);
    const args = {
      active: { search: true },
      username,
    };
    const query = req.query.query;
    if (query) {
      try {
        const games = await services.searchGame(query);
        args.result = {
          query: query,
          games: games,
        };
      } catch (err) {
        if (err.name != "NOT_FOUND") {
          getErrorPage(req, res, err);
          return;
        }
        args.result = {
          query,
          games: [],
        };
      }
    }
    res.render("search", args);
  }

  async function getUserPage(req, res) {
    const username = getUsername(req);
    if (!username) {
      res.redirect("/login");
      return;
    }
    try {
      const user = await services.getUser(username);
      const token = await services.getToken(username);
      Object.assign(user, { token });
      res.render("user", {
        active: { profile: true },
        username,
        user,
      });
    } catch (err) {
      console.log(err);
      getErrorPage(req, res, err);
    }
  }

  async function getDetailsPage(req, res) {
    const username = getUsername(req);
    const args = {
      username,
    };
    try {
      args.gameDetails = await services.getGameDetails(req.params.gameId);
    } catch (err) {
      getErrorPage(req, res, err);
    }
    res.render("details", args);
  }

  async function getGroupsPage(req, res) {
    const username = getUsername(req);
    if (!username) {
      res.redirect("/login");
      return;
    }
    try {
      const groups = await services.listAllGroups(username);

      if (req.method === "POST") {
        if (!req.body.name) {
          if (!req.body.description) {
            throw errors.MISSING_PARAM(
              `parameters 'name' and 'description' are missing`
            );
          }
          throw errors.MISSING_PARAM(`parameter 'name' is missing`);
        } else if (!req.body.description) {
          throw errors.MISSING_PARAM(`parameter 'description' is missing`);
        }

        const name = req.body.name.trim();
        const description = req.body.description.trim();
        if (name == "") {
          throw errors.INVALID_PARAM("group name cannot be empty");
        }
        if (description == "") {
          throw errors.INVALID_PARAM("group description cannot be empty");
        }

        await services.createGroup(username, name, description);
        res.redirect(`/my/groups`);
        return;
      }
      res.render("groups", {
        active: { groups: true },
        username,
        groups,
      });
    } catch (err) {
      getErrorPage(req, res, err);
    }
  }

  async function addGame(req, res) {
    const username = getUsername(req);
    if (!username) {
      res.redirect("/login");
      return;
    }

    try {
      if (req.body.gameId) {
        if (!req.body.groupId) {
          // group is not selected
          getGroupSelectionPage(req, res);
        } else {
          // group is selected -> add game to group
          try {
            await services.addGame(username, req.body.groupId, req.body.gameId);
          } catch (err) {
            if (err.name != "ALREADY_EXISTS") {
              throw err;
            }
          }
          res.redirect(`/my/groups/${req.body.groupId}`);
        }
      } else {
        throw errors.MISSING_PARAM("parameter 'gameId' is missing");
      }
    } catch (err) {
      getErrorPage(req, res, err);
    }
  }

  async function getGroupSelectionPage(req, res) {
    const username = getUsername(req);
    if (!username) {
      res.redirect("/login");
      return;
    }

    try {
      const groups = await services.listAllGroups(username);
      if (groups.length === 0) {
        res.redirect("/my/groups");
        return;
      }

      if (req.body.gameId) {
        const game = await services.getGameDetails(req.body.gameId);
        const args = {
          active: { groups: true },
          username,
          game,
          groups,
        };
        res.render("addGame", args);
      } else {
        throw errors.MISSING_PARAM("parameter 'id' is missing");
      }
    } catch (err) {
      getErrorPage(req, res, err);
    }
  }

  async function getGroupPage(req, res) {
    const username = getUsername(req);
    if (!username) {
      res.redirect("/login");
      return;
    }
    try {
      const group = await services.loadGroup(username, req.params.groupId);
      const games = group.gameIds.map(async (gameId) => {
        return services.getGameById(gameId).catch((err) => {
          throw err;
        });
      });
      delete group.gameIds;

      Promise.all(games)
        .catch((err) => {
          throw err;
        })
        .then((result) => {
          group.id = req.params.groupId;
          group.games = result;
          res.render("group", {
            active: { groups: true },
            username,
            group,
          });
        });
    } catch (err) {
      getErrorPage(req, res, err);
    }
  }

  async function editGroup(req, res) {
    const username = getUsername(req);
    if (!username) {
      res.redirect("/login");
      return;
    }
    try {
      if (!req.body.name) {
        if (!req.body.description) {
          throw errors.MISSING_PARAM(
            `parameters 'name' and 'description' are missing`
          );
        }
        throw errors.MISSING_PARAM(`parameter 'name' is missing`);
      } else if (!req.body.description) {
        throw errors.MISSING_PARAM(`parameter 'description' is missing`);
      }

      const name = req.body.name.trim();
      const description = req.body.description.trim();
      if (name == "") {
        throw errors.INVALID_PARAM("group name cannot be empty");
      }
      if (description == "") {
        throw errors.INVALID_PARAM("group description cannot be empty");
      }

      await services.editGroup(username, req.params.groupId, name, description);
      res.redirect(`/my/groups/${req.params.groupId}`);
    } catch (err) {
      getErrorPage(req, res, err);
    }
  }

  async function getErrorPage(req, res, err) {
    const username = getUsername(req);
    const status = getHttpErrorCode(err);
    const text = friendlyHttpStatus[status];
    const args = {
      username,
      status,
      text,
      err,
    };
    res.status(status).render("error", args);
  }

  const router = express.Router();
  router.use(express.urlencoded({ extended: true }));

  // Get homepage
  router.get("/", getHomepage);

  // Get login page
  router.get("/login", getLoginPage);
  // Login
  router.post("/login", doLogin);
  // Logout
  router.post("/logout", doLogout);

  // Get signup page
  router.get("/signup", getSignupPage);
  // Signup
  router.post("/signup", doSignup);

  // Search page
  router.get("/search", getSearchPage);

  // Get details page
  router.get("/games/:gameId", getDetailsPage);

  // Get user page
  router.get("/my", getUserPage);

  // Get groups page
  router.get("/my/groups", getGroupsPage);
  // Create new group
  router.post("/my/groups", getGroupsPage);
  // Add game to group
  router.post("/my/games", addGame);

  // Get group page
  router.get("/my/groups/:groupId", getGroupPage);

  // Edit group
  router.post("/my/groups/:groupId", editGroup);

  // Delete group             -> client side javascript with API usage
  // Remove game from group   -> client side javascript with API usage

  return router;
};
