"use strict";

const express = require("express");

const openApiUi = require("swagger-ui-express");
const openApiSpec = require("./docs/borga-spec.json");

const errors = require("./borga-errors");

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

function handleError(err, res) {
  const code = getHttpErrorCode(err);
  res.status(code).json({ cause: err });
}

module.exports = function (services) {
  function getUserToken(req) {
    return req.user && req.user.token;
  }

  function getBearerToken(req) {
    const auth = req.headers.authorization;
    if (auth) {
      const authData = auth.trim();
      if (authData.substr(0, 6).toLowerCase() === "bearer") {
        return authData.replace(/^bearer\s+/i, "");
      }
    }
    return null;
  }

  async function getUsername(req) {
    const token = getUserToken(req);
    if (!token) {
      throw errors.UNAUTHENTICATED(`token is missing`);
    }
    return services.getUsername(token);
  }

  async function searchPopularGames(_, res) {
    try {
      const games = await services.getMostPopularGames();
      res.json(games);
    } catch (err) {
      handleError(err, res);
    }
  }

  async function searchGame(req, res) {
    try {
      const games = await services.searchGame(req.query.name);
      res.json({ games });
    } catch (err) {
      handleError(err, res);
    }
  }

  async function listAllGroups(req, res) {
    try {
      const username = await getUsername(req);
      const groups = await services.listAllGroups(username);
      res.json({ groups });
    } catch (err) {
      handleError(err, res);
    }
  }

  async function getGroupDetails(req, res) {
    try {
      const username = await getUsername(req);

      const details = await services.getGroupDetails(
        username,
        req.params.groupId
      );
      res.json(details);
    } catch (err) {
      handleError(err, res);
    }
  }

  async function editGroup(req, res) {
    try {
      const username = await getUsername(req);

      if (!req.body.name) {
        throw errors.MISSING_PARAM("parameter 'name' is missing");
      }
      if (!req.body.description) {
        throw errors.MISSING_PARAM("parameter 'description' is missing");
      }

      const groupId = await services.editGroup(
        username,
        req.params.groupId,
        req.body.name,
        req.body.description
      );
      res.json(groupId);
    } catch (err) {
      handleError(err, res);
    }
  }

  async function createGroup(req, res) {
    try {
      const username = await getUsername(req);

      if (!req.body.name) {
        throw errors.MISSING_PARAM("parameter 'name' is missing");
      }

      if (!req.body.description) {
        throw errors.MISSING_PARAM("parameter 'description' is missing");
      }

      const groupId = await services.createGroup(
        username,
        req.body.name,
        req.body.description
      );
      res.status(201).json({ groupId });
    } catch (err) {
      handleError(err, res);
    }
  }

  async function deleteGroup(req, res) {
    try {
      const username = await getUsername(req);

      const groupId = await services.deleteGroup(username, req.params.groupId);
      res.json({ groupId });
    } catch (err) {
      handleError(err, res);
    }
  }

  async function addGame(req, res) {
    try {
      const username = await getUsername(req);

      if (!req.body.gameId) {
        throw errors.MISSING_PARAM("'gameId' is missing");
      }

      const gameId = await services.addGame(
        username,
        req.params.groupId,
        req.body.gameId
      );
      res.status(201).json({ gameId });
    } catch (err) {
      handleError(err, res);
    }
  }

  async function removeGame(req, res) {
    try {
      const username = await getUsername(req);

      const gameId = await services.removeGame(
        username,
        req.params.groupId,
        req.params.gameId
      );
      res.json({ gameId });
    } catch (err) {
      handleError(err, res);
    }
  }

  async function createUser(req, res) {
    try {
      if (!req.body.username) {
        throw errors.MISSING_PARAM("'username' is missing");
      }
      if (!req.body.name) {
        throw errors.MISSING_PARAM("'name' is missing");
      }
      if (!req.body.password) {
        throw errors.MISSING_PARAM("'password' is missing");
      }

      const token = await services.createUser(
        req.body.name,
        req.body.username,
        req.body.password
      );
      res.status(201).json({ token });
    } catch (err) {
      handleError(err, res);
    }
  }

  function extractToken(req, res, next) {
    const bearerToken = getBearerToken(req);
    if (bearerToken) {
      req.user = { token: bearerToken };
    }
    next();
  }

  const router = express.Router();

  router.use("/docs", openApiUi.serve);
  router.use(express.json());
  router.use(extractToken);

  // Open API docs
  router.get("/docs", openApiUi.setup(openApiSpec));

  // Get most popular games
  router.get("/games/mostPopular", searchPopularGames);
  // Search for games by name
  router.get("/games", searchGame);

  // List user groups
  router.get("/groups", listAllGroups);
  // Get group details
  router.get("/groups/:groupId", getGroupDetails);
  // Edit group
  router.put("/groups/:groupId", editGroup);
  // Create new group
  router.post("/groups", createGroup);
  // Delete group
  router.delete("/groups/:groupId", deleteGroup);
  // Add game to group
  router.post("/groups/:groupId/games", addGame);
  // Remove game from group
  router.delete("/groups/:groupId/games/:gameId", removeGame);

  // Create user
  router.post("/users", createUser);

  return router;
};
