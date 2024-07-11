"use strict";

const fetch = require("node-fetch");
const request = require("supertest");
const config = require("../../../borga-config");
const server = require("../../../borga-server");

const es_spec = {
  url: config.devl_es_url,
  prefix: "test",
};
const baseUrl = `${es_spec.url}`;
const groupsURL = (username) =>
  `${baseUrl}${es_spec.prefix}_${username}_groups`;

const existing_gameId = "TAAifFP590";
const existing_gamename = "Root";

jest.setTimeout(30000);

async function deleteGroup(groupId) {
  return fetch(
    `${groupsURL(config.guest.user)}/_doc/${groupId}?refresh=wait_for`,
    { method: "DELETE" }
  );
}

async function init() {
  // Delete guest groups index
  await fetch(`${baseUrl}${es_spec.prefix}_${config.guest.user}_groups`, {
    method: "DELETE",
  });
  // Delete test tokens
  await fetch(`${baseUrl}${es_spec.prefix}_tokens`, { method: "DELETE" });
  // Delete test users
  await fetch(`${baseUrl}${es_spec.prefix}_users`, { method: "DELETE" });

  // Create guest groups index
  await fetch(`${baseUrl}${es_spec.prefix}_${config.guest.user}_groups`, {
    method: "PUT",
  });
  // Create guest token
  await fetch(
    `${baseUrl}${es_spec.prefix}_tokens/_doc/${config.guest.token}?refresh=wait_for`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: config.guest.user }),
    }
  );
  // Create guest user
  await fetch(
    `${baseUrl}${es_spec.prefix}_users/_doc/${config.guest.user}?refresh=wait_for`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Guest",
      }),
    }
  );
}

test("Confirm database is running", async () => {
  const response = await fetch(`${es_spec.url}_cat/health`);
  expect(response.status).toBe(200);
  await init();
});

// guest user must already exist on the database

describe("Integration tests", () => {
  const app = server(es_spec, config.guest);

  test("Get empty GroupList", async () => {
    const response = await request(app)
      .get("/api/groups")
      .set("Authorization", `Bearer ${config.guest.token}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toBeTruthy();
    expect(response.body.groups).toEqual([]);
  });

  test("Add Group to GroupList", async () => {
    const groupObj = {
      name: "testGroup",
      description: "This is a group created for testing reasons",
    };

    const addResponse = await request(app)
      .post("/api/groups/")
      .set("Authorization", `Bearer ${config.guest.token}`)
      .set("Accept", "application/json")
      .send(groupObj)
      .expect("Content-Type", /json/);
    console.log(addResponse.body);

    // .expect(201);

    expect(addResponse.body).toBeTruthy();
    expect(addResponse.body.groupId).toBeTruthy();

    await deleteGroup(addResponse.body.groupId);
  });

  test("Add Game to Group", async () => {
    // Creating Group
    const groupObj = {
      name: "testGroup",
      description: "This is a group created for testing reasons",
    };

    const addGroupResponse = await request(app)
      .post("/api/groups/")
      .set("Authorization", `Bearer ${config.guest.token}`)
      .set("Accept", "application/json")
      .send(groupObj)
      .expect("Content-Type", /json/)
      .expect(201);

    const groupId = addGroupResponse.body.groupId;

    //Adding Game to Group
    const addResponse = await request(app)
      .post(`/api/groups/${groupId}/games`)
      .set("Authorization", `Bearer ${config.guest.token}`)
      .set("Accept", "application/json")
      .send({ gameId: existing_gameId })
      .expect("Content-Type", /json/)
      .expect(201);

    expect(addResponse.body).toBeTruthy();
    expect(addResponse.body.gameId).toEqual(existing_gameId);

    //Checking if group has game just added
    const listResponse = await request(app)
      .get(`/api/groups/${groupId}`)
      .set("Authorization", `Bearer ${config.guest.token}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(listResponse.body).toBeTruthy();
    expect(listResponse.body.games).toHaveLength(1);
    expect(listResponse.body.games[0]).toEqual(existing_gamename);

    await deleteGroup(addResponse.body.groupId);
  });
});
