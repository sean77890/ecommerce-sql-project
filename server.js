require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const { pool, initSchema } = require('./db/database');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'sql-shop-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
  })
);

// Makes the logged-in user's id and total cart item count available to every
// view (e.g. for the header's cart badge) without each route re-fetching it.
app.use(async (req, res, next) => {
  res.locals.userId = req.session.userId || null;
  if (req.session.userId) {
    try {
      const { rows } = await pool.query(
        'SELECT COALESCE(SUM(quantity), 0) AS count FROM cart_items WHERE user_id = $1',
        [req.session.userId]
      );
      res.locals.cartCount = Number(rows[0].count);
    } catch (err) {
      return next(err);
    }
  } else {
    res.locals.cartCount = 0;
  }
  next();
});

app.get('/', (req, res) => res.redirect('/products'));

app.use('/', authRoutes);
app.use('/products', productRoutes);
app.use('/cart', cartRoutes);
app.use('/orders', orderRoutes);

app.use((req, res) => {
  res.status(404).render('errors/404');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Something went wrong on our end.');
});

// Ensures the database schema exists, then starts the HTTP server.
async function start() {
  await initSchema();
  app.listen(PORT, () => {
    console.log(`SQL Shop running at http://localhost:${PORT}`);
  });
}

start();
