"use strict";

const errors = require("./borga-errors");

module.exports = function (data_ext, data_int) {
  async function getMostPopularGames() {
    const games = await data_ext.getMostPopularGames();
    return { games };
  }

  async function searchGame(query) {
    if (!query) {
      throw errors.MISSING_PARAM("parameter 'query' is missing");
    }
    return data_ext.findGame(query);
  }

  async function getGameById(id) {
    if (!id) {
      throw errors.MISSING_PARAM("parameter 'id' is missing");
    }
    return data_ext.getGameById(id);
  }

  async function getGameDetails(id) {
    if (!id) {
      throw errors.MISSING_PARAM("parameter 'id' is missing");
    }
    return data_ext.getGameDetails(id);
  }

  async function getUsername(token) {
    if (!token) {
      throw errors.UNAUTHENTICATED("No token");
    }
    const username = await data_int.tokenToUsername(token);
    if (!username) {
      throw errors.UNAUTHENTICATED("Bad token");
    }
    return username;
  }

  async function checkAndGetUser(username, password) {
    if (!username || !password) {
      throw errors.MISSING_PARAM("missing credentials");
    }
    const user = await data_int.getUser(username);
    if (user.password !== password) {
      throw errors.INVALID_PARAM(`wrong password for '${username}'`);
    }
    user.token = await data_int.usernameToToken(username);
    return user;
  }

  async function getUser(username) {
    const user = await data_int.getUser(username);
    delete user.password;
    return user;
  }

  async function getGroupDetails(username, groupId) {
    const group = await data_int.loadGroup(username, groupId);
    const games = group.gameIds.map(async (gameId) => {
      const game = await data_ext.getGameById(gameId);
      return game.name;
    });
    delete group.gameIds;

    return Promise.all(games)
      .catch((err) => {
        throw err;
      })
      .then((res) => {
        group.games = res;
        return group;
      });
  }

  async function editGroup(username, groupId, newName, newDescription) {
    await data_int.editGroup(username, groupId, newName, newDescription);
    return { groupId };
  }

  return {
    getUser,
    getMostPopularGames,
    searchGame,
    getGameById,
    getGameDetails,
    createUser: data_int.createUser,
    getUsername,
    getToken: data_int.usernameToToken,
    checkAndGetUser,
    createGroup: data_int.createGroup,
    deleteGroup: data_int.deleteGroup,
    listAllGroups: data_int.listAllGroups,
    loadGroup: data_int.loadGroup,
    getGroupDetails,
    editGroup,
    addGame: data_int.addGame,
    removeGame: data_int.removeGame,
  };
};
