// Expense Tracker - backend (Express API + PostgreSQL)
//
// PHASE 1
// Setup:
//   1. Create a database named expense_tracker and run schema.sql on it.
//   2. Copy .env.example to a new file named .env and write your PostgreSQL password.
//   3. npm install express cors pg dotenv
// Run:    node server.js   (restart it every time you change this file)
//
// Endpoints you need to build:
//   GET    /api/expenses        return all expenses
//   GET    /api/expenses/:id    return one expense (404 if not found)
//   POST   /api/expenses        add an expense (201, or 400 if the data is invalid)
//   PUT    /api/expenses/:id    update an expense (200, 400, or 404)
//   DELETE /api/expenses/:id    delete an expense (200, or 404)
//
// Tips:
//   - Create one Pool (from the "pg" library) with the values from .env,
//     and use pool.query(...) in every route.
//   - ALWAYS send the values as parameters: pool.query("... WHERE id = $1", [id]).
//     NEVER build the SQL text by joining strings with data from the user.
//   - Use RETURNING to get the new (or updated) row back from INSERT and UPDATE.
//   - The database creates the id. The client never sends one.
//   - pg returns NUMERIC as text and DATE as a JavaScript Date, so fix both in your SELECT.
//     Hint: amount::float8 and to_char(date, 'YYYY-MM-DD').
//   - Validate the data before the query, and answer 400 with a message that explains the problem.
//   - Check the id before the query. A text like "abc" makes PostgreSQL throw an error.
//   - Enable CORS so the frontend can talk to the server.
//   - Test every endpoint with Thunder Client BEFORE you connect the frontend.

const dotenv = require('dotenv').config(); //to read the .env file and set the environment variables
const express = require("express"); //to load tools to build server (express framework)
const cors = require("cors"); //to load tools to enable CORS so The fron communicates with the back without the browser blocking the operation due to the port mismatch between them.
const { Pool } = require("pg"); //to load tools to connect to PostgreSQL database (connection pool)

const app = express(); //server instance
const PORT = process.env.PORT || 3000;

// Middlewares purpose ==> to active this concepts to all requests to the server before arrive  to all routes
app.use(cors());
app.use(express.json()); //FROM JSON TO OB to arrive in req.body

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const ALLOWED_CATEGORIES = ['Food', 'Transport', 'Bills', 'Entertainment', 'Other'];
//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                         1. GET ALL (endPoint1)
//////////////////////////////////////////////////////////////////////////////////////////////////////
app.get("/api/expenses", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, amount::float, category, to_char(date, 'YYYY-MM-DD') AS date 
      FROM expenses 
      ORDER BY id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err); //in terminal 
    res.status(500).json({ error: 'Server Error' });
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                          2. GET ONE BY ID 
//////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get("/api/expenses/:id", async (req, res) => { //:id is route param
  const id = Number(req.params.id); // Convert the id from string to number  in URL is str

  if (isNaN(id)) {
    return res.status(404).json({ error: 'Invalid ID format' });
  }

  try {
    const result = await pool.query(`
      SELECT id, title, amount::float, category, to_char(date, 'YYYY-MM-DD') AS date 
      FROM expenses 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                 3. POST 
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post("/api/expenses", async (req, res) => {
  const { title, amount, category, date } = req.body;

  // Validation about title col
  if (!title || typeof title !== 'string' || title.trim() === '') { //!title==>! (title is undefined || null || empty string)
    return res.status(400).json({ error: 'Title is required' });
  }

  // Validation amount
  const numericAmount = Number(amount); //amount is in original num but in URL is arrive as a str
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a number greater than 0' });
  }

  // Validation about category col
  if (!category || !ALLOWED_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}` });
  }

  // Validation about date col
  if (!date || isNaN(Date.parse(date))) {
    return res.status(400).json({ error: 'A valid date is required' });
  }

  try {
    const queryText = `
      INSERT INTO expenses (title, amount, category, date) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, title, amount::float, category, to_char(date, 'YYYY-MM-DD') AS date
    `;
    
    const result = await pool.query(queryText, [title.trim(), numericAmount, category, date]);
    res.status(201).json(result.rows[0]); //data come from returning 
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                              4. PUT
///////////////////////////////////////////////////////////////////////////////////////////////////////////
app.put("/api/expenses/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(404).json({ error: 'Invalid ID format' });
  }

  const { title, amount, category, date } = req.body;

  // Validation repeate same as POST
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a number greater than 0' });
  }

  if (!category || !ALLOWED_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}` });
  }

  if (!date || isNaN(Date.parse(date))) {
    return res.status(400).json({ error: 'A valid date is required' });
  }

  try {
    const queryText = `
      UPDATE expenses 
      SET title = $1, amount = $2, category = $3, date = $4 
      WHERE id = $5 
      RETURNING id, title, amount::float, category, to_char(date, 'YYYY-MM-DD') AS date
    `;

    const result = await pool.query(queryText, [title.trim(), numericAmount, category, date, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                5. DELETE 
////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.delete("/api/expenses/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(404).json({ error: 'Invalid ID format' });
  }

  try {
    const result = await pool.query('DELETE FROM expenses WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ message: 'Expense deleted successfully', id: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// run the server 
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});