"use strict";

const errors = require("./borga-errors");
const fetch = require("node-fetch");

const ATLAS_CLIENT_ID = process.env.ATLAS_CLIENT_ID;

if (!ATLAS_CLIENT_ID) {
  throw Error("'ATLAS_CLIENT_ID' is not defined");
}

const BOARD_GAME_ATLAS_BASE_URI = "https://api.boardgameatlas.com/api";

const HTTP_SERVER_ERROR_CLASS = 5;

function getStatusClass(statusCode) {
  return ~~(statusCode / 100);
}

function doFetch(uri) {
  console.log("\x1b[2m%s\x1b[0m", `fetching '${uri}'`);
  return fetch(uri)
    .catch((err) => {
      throw errors.EXT_SVC_FAILURE(err);
    })
    .then((res) => {
      if (res.ok) {
        return res.json().catch((err) => {
          throw errors.EXT_SVC_FAILURE(err);
        });
      } else {
        if (getStatusClass(res.status) === HTTP_SERVER_ERROR_CLASS) {
          return res
            .json()
            .catch(() => res) // Non JSON response
            .then((info) => {
              throw errors.EXT_SVC_FAILURE(info);
            });
        } else {
          throw errors.FAILURE(res);
        }
      }
    });
}

function makeGameObj(gameInfo) {
  return {
    id: gameInfo.id,
    name: gameInfo.name,
    url: gameInfo.url,
    imageUrl: gameInfo.image_url,
    rank: gameInfo.rank,
    description: gameInfo.description,
  };
}

function findGame(query) {
  console.log("\x1b[2m%s\x1b[0m", `searching for game '${query}'`);
  if (!query) {
    throw errors.MISSING_PARAM("parameter 'query' is missing");
  }
  const search_uri =
    BOARD_GAME_ATLAS_BASE_URI +
    `/search?client_id=${ATLAS_CLIENT_ID}&name=${query}&order_by=rank`;
  return doFetch(search_uri)
    .catch((err) => {
      throw err;
    })
    .then((res) => {
      if (!res.games) {
        throw errors.EXT_SVC_FAILURE({ res });
      }
      if (res.games.length) {
        const games = [];
        res.games.forEach((game) => {
          games.push(makeGameObj(game));
        });
        return games;
      } else {
        throw errors.NOT_FOUND(`No games found for query '${query}'`);
      }
    });
}

function getMostPopularGames() {
  console.log("\x1b[2m%s\x1b[0m", "fetching for most popular games ");
  const search_uri =
    BOARD_GAME_ATLAS_BASE_URI +
    `/search?client_id=${ATLAS_CLIENT_ID}&order_by=rank`;
  return doFetch(search_uri)
    .catch((err) => {
      throw err;
    })
    .then((res) => {
      if (res.games) {
        return res.games.map((game) => makeGameObj(game));
      } else {
        throw errors.EXT_SVC_FAILURE({ res });
      }
    });
}

function getGameInfo(id) {
  console.log("\x1b[2m%s\x1b[0m", `fetching game with id '${id}'`);
  if (!id) {
    throw errors.MISSING_PARAM("parameter 'id' is missing");
  }
  const search_uri =
    BOARD_GAME_ATLAS_BASE_URI +
    `/search?client_id=${ATLAS_CLIENT_ID}&ids=${id}&limit=1`;
  return doFetch(search_uri)
    .catch((err) => {
      throw err;
    })
    .then((res) => {
      if (!res.games) {
        throw errors.EXT_SVC_FAILURE({ res });
      }
      if (res.games.length) {
        return res.games[0];
      } else {
        throw errors.NOT_FOUND({ query });
      }
    });
}

function getGameById(id) {
  return getGameInfo(id)
    .catch((err) => {
      throw err;
    })
    .then(makeGameObj);
}

async function getGameDetails(id) {
  const gameInfo = await getGameInfo(id);
  const mechanics = await getMechanics();
  const categories = await getCategories();

  const mechanicIds = gameInfo.mechanics.map((mechanic) => mechanic.id);
  const categoryIds = gameInfo.categories.map((category) => category.id);

  const gameDetails = makeGameObj(gameInfo);
  gameDetails.mechanics = mechanics.filter((mechanic) =>
    mechanicIds.includes(mechanic.id)
  );
  gameDetails.categories = categories.filter((category) =>
    categoryIds.includes(category.id)
  );
  gameDetails.yearPublished = gameInfo.year_published;
  gameDetails.description = gameInfo.description_preview.trim();

  return gameDetails;
}

function getMechanics() {
  console.log("\x1b[2m%s\x1b[0m", `fetching mechanics`);
  const search_uri =
    BOARD_GAME_ATLAS_BASE_URI + `/game/mechanics?client_id=${ATLAS_CLIENT_ID}`;
  return doFetch(search_uri)
    .catch((err) => {
      throw err;
    })
    .then((res) => res.mechanics);
}

function getCategories() {
  console.log("\x1b[2m%s\x1b[0m", `fetching categories`);
  const search_uri =
    BOARD_GAME_ATLAS_BASE_URI + `/game/categories?client_id=${ATLAS_CLIENT_ID}`;
  return doFetch(search_uri)
    .catch((err) => {
      throw err;
    })
    .then((res) => res.categories);
}

module.exports = {
  findGame,
  getMostPopularGames,
  getGameById,
  getGameDetails,
};
