const express = require('express');
const db = require('../db/database');
const { hashPassword, verifyPassword } = require('../utils/password');

const router = express.Router();

router.get('/register', (req, res) => {
  res.render('auth/register', { error: null });
});

router.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).render('auth/register', { error: 'All fields are required.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).render('auth/register', { error: 'An account with that email already exists.' });
  }

  const passwordHash = hashPassword(password);
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, passwordHash);

  req.session.userId = info.lastInsertRowid;
  res.redirect('/products');
});

router.get('/login', (req, res) => {
  res.render('auth/login', { error: null });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(400).render('auth/login', { error: 'Invalid email or password.' });
  }

  req.session.userId = user.id;
  res.redirect('/products');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
