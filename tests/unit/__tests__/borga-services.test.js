"use strict";

const errors = require("../../../borga-errors");

const services_builder = require("../../../borga-services");

const mock_data_ext = require("../__mocks__/app-data-ext-groups");
const test_data_int = require("../../../borga-data-int-mem");

const existing_username = "guest";
const existing_token = "fz3zMebxQXybYskc567j5w";
const existing_groupid = "EfmTZS3TQZWxdfsYYnNOUA";
const existing_groupname = "group1";

const test_query = "Root";
const test_gameId = "TAAifFP590";

const default_services = services_builder(mock_data_ext, test_data_int);

describe("searchGame tests", () => {
  test("search game without a query", async () => {
    try {
      await default_services.searchGame(undefined);
    } catch (err) {
      expect(err.name).toEqual("MISSING_PARAM");
      return;
    }
    throw new Error("shouldn't return from searchGame when query is empty");
  });

  test("search for inexisting game", async () => {
    const services = services_builder(
      {
        findGame: async () => {
          throw errors.NOT_FOUND("no game");
        },
      },
      test_data_int
    );

    try {
      await services.searchGame("inexisting game");
    } catch (err) {
      expect(err.name).toEqual("NOT_FOUND");
      return;
    }
    throw new Error("shouldn't return from searchGame when game doesn't exist");
  });

  test("search for existing game", async () => {
    const res = await default_services.searchGame(test_query);
    expect(res).toEqual(mock_data_ext.games[test_gameId]);
  });
});

describe("getGroupDetails tests", () => {
  test("get group details with inexisting username", async () => {
    try {
      await default_services.getGroupDetails("inexisting_user", "irrelevant");
    } catch (err) {
      expect(err.name).toEqual("NOT_FOUND");
      return;
    }
    throw new Error(
      "shouldn't return from getGroupDetails when username doesn't exist"
    );
  });

  test("get group details with inexisting group", async () => {
    try {
      await default_services.getGroupDetails(
        existing_username,
        "inexisting_group"
      );
    } catch (err) {
      expect(err.name).toEqual("NOT_FOUND");
      return;
    }
    throw new Error(
      "shouldn't return from getGroupDetails when username doesn't exist"
    );
  });

  test("get group details with success", async () => {
    const res = await default_services.getGroupDetails(
      existing_username,
      existing_groupid
    );
    expect(res.name).toEqual(existing_groupname);
  });
});

describe("getUsername tests", () => {
  test("get username with undefined token", async () => {
    try {
      await default_services.getUsername(undefined);
    } catch (err) {
      expect(err.name).toEqual("UNAUTHENTICATED");
      return;
    }
    throw new Error(
      "shouldn't return from getUsername when 'token' is undefined"
    );
  });

  test("get username with inexisting token", async () => {
    try {
      await default_services.getUsername("inexisting_token");
    } catch (err) {
      expect(err.name).toEqual("UNAUTHENTICATED");
      return;
    }
    throw new Error(
      "shouldn't return from getUsername when 'token' does not exist"
    );
  });

  test("get username with success", async () => {
    const res = await default_services.getUsername(existing_token);
    expect(res).toEqual(existing_username);
  });
});
