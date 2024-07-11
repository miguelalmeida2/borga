"use strict";

const errors = require("../../../borga-errors");

const games = {
  TAAifFP590: {
    id: "TAAifFP590",
    name: "Root",
    url: "https://www.boardgameatlas.com/game/TAAifFP590/root",
    imageUrl:
      "https://s3-us-west-1.amazonaws.com/5cc.images/games/uploaded/1629324760985.jpg",
    rank: 1,
    description:
      "<p>Find adventure in this marvelous asymmetric game. Root provides limitless replay value as you and your friends explore the unique factions all wanting to rule a fantastic forest kingdom. Play as the Marquise de Cat and dominate the woods, extracting its riches and policing its inhabitants, as the Woodland Alliance, gathering supporters and coordinate revolts against the ruling regime, the Eyrie Dynasties, regaining control of the woods while keeping your squabbling court at bay, or as the Vagabond, seeking fame and fortune as you forge alliances and rivalries with the other players. Each faction has its own play style and paths to victory, providing an immersive game experience you will want to play again and again.</p>",
  },
  yqR4PtpO8X: {
    id: "yqR4PtpO8X",
    name: "Scythe",
    url: "https://www.boardgameatlas.com/game/yqR4PtpO8X/scythe",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0513/4077/1515/products/scythe-board-game.jpg?v=1611090922",
    rank: 2,
    description:
      "<p><em>Scythe</em> gives players almost complete control over their fate. Other than each player's individual hidden objective card, the only elements of luck or variability are &quot;Encounter&quot; cards that players will draw as they interact with the citizens of newly explored lands. Each encounter card provides the player with several options, allowing them to mitigate the luck of the draw through their selection. Combat is also driven by choices, not luck or randomness.<br /><br /><em>Scythe</em> uses a streamlined action-selection mechanism (no rounds or phases) to keep gameplay moving at a brisk pace and reduce downtime between turns. While there is plenty of direct conflict for players who seek it, there is no player elimination.<br /><br />Every part of <em>Scythe</em> has an aspect of engine-building to it. Players can upgrade actions to become more efficient, build structures that improve their position on the map, enlist new recruits to enhance character abilities, activate mechs to deter opponents from invading, and expand their borders to reap greater types and quantities of resources. These engine-building aspects create a sense of momentum and progress throughout the game. The order in which players improve their engine adds to the unique feel of each game, even when playing one faction multiple times.</p>",
  },
};

const queries = {
  Root: "TAAifFP590",
  Scythe: "yqR4PtpO8X",
};

async function findGame(query) {
  const gameId = queries[query];
  return getGameById(gameId);
}

async function getGameById(gameId) {
  const game = gameId && games[gameId];
  if (!game) {
    throw errors.NOT_FOUND(gameId);
  }
  return game;
}

module.exports = {
  games,
  findGame,
  getGameById,
};
