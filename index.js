import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "1144ad",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}

async function checkVisited() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id=user_id WHERE user_id=($1)",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function renderPageWithErr(res, string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    res.status(404).send("User not found");
    return;
  }
  const countries = await checkVisited();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
    error: string,
  });
}

app.get("/", async (req, res) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    res.status(404).send("User not found");
    return;
  }
  const countries = await checkVisited();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      renderPageWithErr(res, "Country already added");
    }
  } catch (err) {
    renderPageWithErr(res, "Country not found");
  }
});

app.post("/user", async (req, res) => {
  if (req.body.user) {
    currentUserId = req.body.user;
    res.redirect("/");
  } else {
    res.render("new.ejs");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;
  try {
    await db.query(
      "INSERT INTO users (name, color) VALUES ($1, $2) RETURNING id",
      [name, color]
    );
    res.redirect("/");
  } catch (err) {
    renderPageWithErr(res, "Couldn't add user");
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
