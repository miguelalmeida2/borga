"use strict";

const errors = require("./borga-errors");
const crypto = require("crypto");
const fetch = require("node-fetch");
const RandExp = require("randexp");

module.exports = function (es_spec, guest) {
  const baseUrl = `${es_spec.url}`;
  const usersURL = `${baseUrl}${es_spec.prefix}_users`;
  const tokensURL = `${baseUrl}${es_spec.prefix}_tokens`;
  const groupsURL = (username) =>
    `${baseUrl}${es_spec.prefix}_${username}_groups`;

  function createToken() {
    return Buffer.from(crypto.randomUUID().replace(/-/g, ""), "hex")
      .toString("base64")
      .replace(/=/g, "");
  }

  function createId() {
    return new RandExp(/^[a-zA-Z0-9]{16}$/).gen();
  }

  const assertDefined = (param, paramName) => {
    if (!param) {
      throw errors.MISSING_PARAM(`'${paramName}' is missing`);
    }
    return param;
  };

  function encode(string) {
    return string.replace(/\//g, "%2F");
  }

  async function tokenToUsername(token) {
    assertDefined(token, "token");
    try {
      const encodedToken = encode(token);
      const response = await fetch(`${tokensURL}/_doc/${encodedToken}`);
      const answer = await response.json();
      return answer._source.username;
    } catch (err) {
      throw errors.FAILURE(err);
    }
  }

  async function usernameToToken(username) {
    assertDefined(username, "username");
    if (!(await hasUser(username))) {
      throw errors.NOT_FOUND(`user '${username}' was not found`);
    }
    try {
      const size = 10;
      let count = 0;
      let from = 0;
      let totalHits;
      do {
        const response = await fetch(
          `${tokensURL}/_search?from=${from}&size=${size}`
        );
        const answer = await response.json();
        for (const hit of answer.hits.hits) {
          if (hit._source.username === username) {
            return hit._id;
          }
        }
        totalHits = answer.hits.total.value;
        from += size;
      } while (count < totalHits);
    } catch (err) {
      throw errors.FAILURE(err);
    }
    // Should never reach this code
    throw errors.FAILURE(`Failed to find token for '${username}'`);
  }

  const hasUser = async (username) => {
    assertDefined(username, "username");
    try {
      const response = await fetch(`${usersURL}/_doc/${username}`);
      return response.status === 200;
    } catch (err) {
      throw errors.FAILURE(err);
    }
  };

  async function hasGroup(username, groupId) {
    assertDefined(username, "username");
    assertDefined(groupId, "groupId");
    if (!(await hasUser(username))) {
      throw errors.NOT_FOUND(`user '${username}' was not found`);
    }
    try {
      const response = await fetch(`${groupsURL(username)}/_doc/${groupId}`);
      return response.status === 200;
    } catch (err) {
      throw errors.FAILURE(err);
    }
  }

  async function hasGame(username, groupId, gameId) {
    assertDefined(username, "username");
    assertDefined(groupId, "groupId");
    assertDefined(gameId, "gameId");
    if (!(await hasUser(username))) {
      throw errors.NOT_FOUND(`user '${username}' was not found`);
    }
    if (!(await hasGroup(username, groupId))) {
      throw errors.NOT_FOUND(`group '${groupId}' was not found`);
    }
    try {
      const response = await fetch(`${groupsURL(username)}/_doc/${groupId}`);
      const answer = await response.json();
      return answer._source.gameIds.includes(gameId);
    } catch (err) {
      throw errors.FAILURE(err);
    }
  }

  async function listAllGroups(username) {
    assertDefined(username, "username");
    if (!(await hasUser(username))) {
      throw errors.NOT_FOUND(`user '${username}' was not found`);
    }
    try {
      const groups = [];
      const size = 10;
      let from = 0;
      let totalHits;
      do {
        const response = await fetch(
          `${groupsURL(username)}/_search?from=${from}&size=${size}`
        );
        const answer = await response.json();
        answer.hits.hits.forEach((hit) => {
          groups.push(Object.assign({ id: hit._id }, hit._source));
        });
        totalHits = answer.hits.total.value;
        from += size;
      } while (groups.length < totalHits);
      return groups;
    } catch (err) {
      throw errors.FAILURE(err);
    }
  }

  async function createUser(name, username, password) {
    assertDefined(name, "name");
    assertDefined(password, "password");
    if (await hasUser(username)) {
      throw errors.ALREADY_EXISTS(`user '${username}' already exists`);
    }

    const user = { name, password };
    const token = createToken();
    try {
      const encodedToken = encode(token);
      // Create groups index
      let response = await fetch(`${groupsURL(username)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.status === 200) {
        // Add token
        response = await fetch(
          `${tokensURL}/_doc/${encodedToken}?refresh=wait_for`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username }),
          }
        );
        if (response.status === 201) {
          // Create user
          response = await fetch(
            `${usersURL}/_doc/${username}?refresh=wait_for`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(user),
            }
          );
          if (response.status === 201) {
            return token;
          }
        }
      }
    } catch (err) {
      throw errors.FAILURE(err);
    }
    throw errors.EXT_SVC_FAILURE(`failed to create user '${username}'`);
  }

  async function getUser(username) {
    assertDefined(username, "username");
    try {
      const response = await fetch(`${usersURL}/_doc/${username}`);
      if (response.status === 200) {
        const answer = await response.json();
        return Object.assign({ username: answer._id }, answer._source);
      }
    } catch (err) {
      throw errors.FAILURE(err);
    }
    throw errors.NOT_FOUND(`user '${username}' was not found`);
  }

  async function loadGroup(username, groupId) {
    assertDefined(groupId, "groupId");
    if (!(await hasUser(username))) {
      throw errors.NOT_FOUND(`user '${username}' was not found`);
    }
    try {
      const response = await fetch(`${groupsURL(username)}/_doc/${groupId}`);
      if (response.status === 200) {
        const answer = await response.json();
        return answer._source;
      }
    } catch (err) {
      throw errors.FAILURE(err);
    }
    throw errors.NOT_FOUND(`group '${groupId}' was not found`);
  }

  async function editGroup(username, groupId, newName, newDescription) {
    assertDefined(newName, "newName");
    assertDefined(newDescription, "newDescription");
    if (!(await hasGroup(username, groupId))) {
      throw errors.NOT_FOUND(`group '${groupId}' was not found`);
    }
    const updateObj = {
      doc: {
        name: newName,
        description: newDescription,
      },
    };
    try {
      const response = await fetch(
        `${groupsURL(username)}/_update/${groupId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateObj),
        }
      );
      if (response.status === 200) {
        return groupId;
      }
    } catch (err) {
      throw errors.FAILURE(err);
    }
    throw errors.EXT_SVC_FAILURE(`failed to edit group '${groupId}'`);
  }

  async function deleteGroup(username, groupId) {
    if (!(await hasGroup(username, groupId))) {
      throw errors.NOT_FOUND(`group '${groupId}' was not found`);
    }
    try {
      const response = await fetch(
        `${groupsURL(username)}/_doc/${groupId}?refresh=wait_for`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (response.status === 200) {
        return groupId;
      }
    } catch (err) {
      throw errors.FAILURE(err);
    }
    throw errors.EXT_SVC_FAILURE(`failed to delete group '${groupId}'`);
  }

  async function createGroup(username, name, description) {
    assertDefined(name, "name");
    assertDefined(description, "description");
    if (!(await hasUser(username))) {
      throw errors.NOT_FOUND(`user '${username}' was not found`);
    }
    const groupObj = {
      name: name,
      description: description,
      gameIds: [],
    };
    const groupId = createId();
    try {
      const response = await fetch(
        `${groupsURL(username)}/_doc/${groupId}?refresh=wait_for`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(groupObj),
        }
      );
      if (response.status === 201) {
        return groupId;
      }
    } catch (err) {
      throw errors.FAILURE(err);
    }
    throw errors.EXT_SVC_FAILURE(`failed to create group '${name}'`);
  }

  async function addGame(username, groupId, gameId) {
    if (await hasGame(username, groupId, gameId)) {
      throw errors.ALREADY_EXISTS(`game '${gameId}' already exists`);
    }
    const updateObj = {
      script: {
        source: `ctx._source.gameIds.add('${gameId}')`,
        lang: "painless",
      },
    };
    try {
      const response = await fetch(
        `${groupsURL(username)}/_update/${groupId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateObj),
        }
      );
      if (response.status === 200) {
        return gameId;
      }
    } catch (err) {
      throw errors.FAILURE(err);
    }
    throw errors.EXT_SVC_FAILURE(`failed to add game '${gameId}'`);
  }

  async function removeGame(username, groupId, gameId) {
    if (!(await hasGame(username, groupId, gameId))) {
      throw errors.NOT_FOUND(`game '${gameId}' was not found`);
    }
    const updateObj = {
      script: {
        source: `ctx._source.gameIds.remove(ctx._source.gameIds.indexOf('${gameId}'))`,
        lang: "painless",
      },
    };
    try {
      const response = await fetch(
        `${groupsURL(username)}/_update/${groupId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateObj),
        }
      );
      if (response.status === 200) {
        return gameId;
      }
    } catch (err) {
      throw errors.FAILURE(err);
    }
    throw errors.EXT_SVC_FAILURE(`failed to remove game '${gameId}'`);
  }

  async function createGuestUser() {
    const username = guest.user;
    const token = guest.token;
    const password = guest.password;
    const user = { name: "Guest", password };
    try {
      const encodedToken = encode(token);
      let response = await fetch(`${groupsURL(username)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.status === 200) {
        response = await fetch(
          `${tokensURL}/_doc/${encodedToken}?refresh=wait_for`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username }),
          }
        );
        if (response.status === 201) {
          response = await fetch(
            `${usersURL}/_doc/${username}?refresh=wait_for`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(user),
            }
          );
          if (response.status === 201) {
            return token;
          }
        }
      }
    } catch (err) {
      throw errors.FAILURE(err);
    }
    throw errors.EXT_SVC_FAILURE(`failed to create user '${username}'`);
  }

  createGuestUser()
    .then((token) => {
      console.log("Created guest user: ", token);
    })
    .catch((_) => {
      // Failed to create guest user.
      // Probably because it already exists
    });

  return {
    getUser,
    createUser,
    tokenToUsername,
    usernameToToken,
    createGroup,
    loadGroup,
    editGroup,
    listAllGroups,
    deleteGroup,
    addGame,
    removeGame,
  };
};
