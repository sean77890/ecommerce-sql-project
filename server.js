const path = require('path');
const express = require('express');
const session = require('express-session');
const db = require('./db/database');

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
    secret: 'sql-shop-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
  })
);

// Expose session/cart info to every view
app.use((req, res, next) => {
  res.locals.userId = req.session.userId || null;
  if (req.session.userId) {
    const row = db
      .prepare('SELECT COALESCE(SUM(quantity), 0) AS count FROM cart_items WHERE user_id = ?')
      .get(req.session.userId);
    res.locals.cartCount = row.count;
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

app.listen(PORT, () => {
  console.log(`SQL Shop running at http://localhost:${PORT}`);
});
