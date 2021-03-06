const keys = require("./keys");

// Express App Setup
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const { Client } = require("pg");
const pgClient = new Client({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});
pgClient.connect();

pgClient.query("CREATE TABLE IF NOT EXISTS values (number int)", (err, res) => {
  console.log("inside iniy");
  if (err) {
    console.log(err, "err");
    return;
  }
  console.log("Table is successfully created");
});

// Redis Client Setup
const redis = require("redis");
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});
const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get("/", (req, res) => {
  res.send("Hi");
});

app.get("/api/values/all", async (req, res) => {
  console.log("inside all");
  pgClient.query("SELECT * from values", (err, resp) => {
    if (err) {
      console.log(err, "err");
      return;
    }
    console.log("All response", resp.rows);
    res.send(resp.rows);
  });
});

app.get("/api/values/current", async (req, res) => {
  redisClient.hgetall("values", (err, values) => {
    console.log(values,"current",err);
    res.send(values);
  });
});

app.post("/api/values", async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send("Index too high");
  }

  redisClient.hset("values", index, "Nothing yet!");
  redisPublisher.publish("insert", index);
  pgClient.query("INSERT INTO values(number) VALUES($1)", [index]);

  res.send({ working: true });
});

app.listen(5000, (err) => {
  console.log("Listening");
});
