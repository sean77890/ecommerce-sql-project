const express = require('express');
const { pool } = require('../db/database');
const { hashPassword, verifyPassword } = require('../utils/password');

const router = express.Router();

router.get('/register', (req, res) => {
  res.render('auth/register', { error: null });
});

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).render('auth/register', { error: 'All fields are required.' });
    }

    const { rows: existingRows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingRows.length > 0) {
      return res.status(400).render('auth/register', { error: 'An account with that email already exists.' });
    }

    const passwordHash = hashPassword(password);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [name, email, passwordHash]
    );

    req.session.userId = rows[0].id;
    res.redirect('/products');
  } catch (err) {
    next(err);
  }
});

router.get('/login', (req, res) => {
  res.render('auth/login', { error: null });
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(400).render('auth/login', { error: 'Invalid email or password.' });
    }

    req.session.userId = user.id;
    res.redirect('/products');
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
