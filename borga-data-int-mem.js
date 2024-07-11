"use strict";

const errors = require("./borga-errors");
const crypto = require("crypto");
const RandExp = require("randexp");

const users = {
  guest: {
    name: "Guest",
    password: "guest",
  },
};

const tokens = {
  fz3zMebxQXybYskc567j5w: "guest",
};

const groups = {
  guest: {
    EfmTZS3TQZWxdfsYYnNOUA: {
      name: "group1",
      description: "test group",
      gameIds: ["TAAifFP590", "yqR4PtpO8X"],
    },
  },
};

const assertDefined = (param, paramName) => {
  if (!param) {
    throw errors.MISSING_PARAM(`parameter '${paramName}' is missing`);
  }
  return param;
};

const hasUser = async (username) => {
  assertDefined(username, "username");
  return !!users[username];
};

const hasGroup = async (username, groupId) => {
  if (!(await hasUser(username))) {
    throw errors.NOT_FOUND(`username '${username}' was not found`);
  }
  assertDefined(groupId, "groupId");
  return !!groups[username][groupId];
};

const hasGame = async (username, groupId, gameId) => {
  assertDefined(username, "username");
  assertDefined(groupId, "groupId");
  assertDefined(gameId, "gameId");
  if (!(await hasUser(username))) {
    throw errors.NOT_FOUND(`username '${username}' was not found`);
  }
  const group = groups[username][groupId];
  if (!group) {
    throw errors.NOT_FOUND(`group '${groupId}' was not found`);
  }
  return group.gameIds.includes(gameId);
};

async function tokenToUsername(token) {
  assertDefined(token, "token");
  return tokens[token];
}

async function usernameToToken(username) {
  assertDefined(username, "username");
  if (!(await hasUser(username))) {
    throw errors.NOT_FOUND(`user '${username}' was not found`);
  }
  const token = Object.keys(tokens).find((key) => tokens[key] === username);
  if (token) {
    return token;
  }
  // Should never reach this code
  throw errors.FAILURE(`Failed to find token for '${username}'`);
}

function createToken() {
  return Buffer.from(crypto.randomUUID().replace(/-/g, ""), "hex")
    .toString("base64")
    .replace(/=/g, "");
}

function createId() {
  return new RandExp(/^[a-zA-Z0-9]{16}$/).gen();
}

async function getUser(username) {
  assertDefined(username, "username");
  if (!(await hasUser(username))) {
    throw errors.NOT_FOUND(`user '${username}' was not found`);
  }
  const user = {};
  user.username = username;
  user.name = users[username].name;
  user.password = users[username].password;
  return user;
}

async function createUser(name, username, password) {
  console.log(
    "\x1b[2m%s\x1b[0m",
    `creating user ${JSON.stringify({ name, username })}`
  );
  if (await hasUser(username)) {
    throw errors.ALREADY_EXISTS(`username '${username}' already exists`);
  }
  assertDefined(name, "name");
  const token = createToken();
  tokens[token] = username;
  users[username] = { name, password };
  groups[username] = {};
  return token;
}

async function createGroup(username, name, description) {
  console.log(
    "\x1b[2m%s\x1b[0m",
    `creating group ${JSON.stringify({ username, name, description })}`
  );
  assertDefined(name, "name");
  assertDefined(description, "description");
  const groupId = createId();
  groups[username][groupId] = {
    name,
    description,
    gameIds: [],
  };
  return groupId;
}

async function loadGroup(username, groupId) {
  console.log(
    "\x1b[2m%s\x1b[0m",
    `loading group ${JSON.stringify({ username, groupId })}`
  );
  assertDefined(username, "username");
  assertDefined(groupId, "groupId");
  if (!(await hasGroup(username, groupId))) {
    throw errors.NOT_FOUND(`group '${groupId}' was not found`);
  }
  const group = groups[username][groupId];
  return {
    name: group.name,
    description: group.description,
    gameIds: group.gameIds,
  };
}

async function editGroup(username, groupId, newName, newDescription) {
  console.log(
    "\x1b[2m%s\x1b[0m",
    `editing group ${JSON.stringify({
      username,
      groupId,
      newName,
      newDescription,
    })}`
  );
  assertDefined(username, "username");
  assertDefined(groupId, "groupId");
  assertDefined(newName, "newName");
  assertDefined(newDescription, "newDescription");
  if (!(await hasGroup(username, groupId))) {
    throw errors.NOT_FOUND(`group '${groupId}' was not found`);
  }
  groups[username][groupId].name = newName;
  groups[username][groupId].description = newDescription;
  return groupId;
}

async function listAllGroups(username) {
  console.log(
    "\x1b[2m%s\x1b[0m",
    `listing all groups ${JSON.stringify({ username })}`
  );
  assertDefined(username, "username");
  if (!groups[username]) {
    throw errors.NOT_FOUND(`user '${username}' has no groups`);
  }
  const allGroups = [];
  Object.entries(groups[username]).forEach(([key, value]) => {
    allGroups.push(Object.assign({ id: key }, value));
  });
  return allGroups;
}

async function deleteGroup(username, groupId) {
  console.log(
    "\x1b[2m%s\x1b[0m",
    `deleting group ${JSON.stringify({ username, groupId })}`
  );
  assertDefined(username, "username");
  if (!(await hasGroup(username, groupId))) {
    throw errors.NOT_FOUND(`group '${groupId}' was not found`);
  }
  delete groups[username][groupId];
  return groupId;
}

async function addGame(username, groupId, gameId) {
  console.log(
    "\x1b[2m%s\x1b[0m",
    `adding game ${JSON.stringify({ username, groupId, gameId })}`
  );
  if (await hasGame(username, groupId, gameId)) {
    throw errors.ALREADY_EXISTS(`game '${gameId}' already exists`);
  }
  groups[username][groupId].gameIds.push(gameId);
  return gameId;
}

async function removeGame(username, groupId, gameId) {
  console.log(
    "\x1b[2m%s\x1b[0m",
    `removing game ${JSON.stringify({ username, groupId, gameId })}`
  );
  if (!(await hasGame(username, groupId, gameId))) {
    throw errors.NOT_FOUND(`game '${gameId}' was not found`);
  }
  groups[username][groupId].gameIds.pop(gameId);
  return gameId;
}

module.exports = {
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
