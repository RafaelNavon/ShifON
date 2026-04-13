const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "name, email and password are required" });
  }
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
      [name, email, password_hash, role || "staff"],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email already in use" });
    }
    console.error("Error in POST register:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  try {
    console.log('[auth/login] looking up email:', email);
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [email],
    );
    const user = rows[0];
    console.log('[auth/login] user found:', !!user);
    const passwordMatch = !!user && (await bcrypt.compare(password, user.password_hash));
    console.log('[auth/login] password match:', passwordMatch);
    if (!user || !passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Error in POST login:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
