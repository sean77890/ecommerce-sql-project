const express = require('express');
const db = require('../db/database');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

function getCartItems(userId) {
  return db
    .prepare(
      `SELECT cart_items.id, cart_items.quantity, products.id AS product_id,
              products.name, products.price_cents, products.image_url, products.stock_qty
       FROM cart_items
       JOIN products ON products.id = cart_items.product_id
       WHERE cart_items.user_id = ?
       ORDER BY cart_items.id`
    )
    .all(userId);
}

router.get('/', (req, res) => {
  const items = getCartItems(req.session.userId);
  const subtotalCents = items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  res.render('cart/index', { items, subtotalCents });
});

router.post('/add', (req, res) => {
  const productId = Number(req.body.product_id);
  const quantity = Math.max(1, Number(req.body.quantity) || 1);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) {
    return res.status(404).render('errors/404');
  }

  const existing = db
    .prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?')
    .get(req.session.userId, productId);

  if (existing) {
    const newQty = Math.min(existing.quantity + quantity, product.stock_qty);
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
  } else {
    const qty = Math.min(quantity, product.stock_qty);
    db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)').run(
      req.session.userId,
      productId,
      qty
    );
  }

  res.redirect('/cart');
});

router.post('/update', (req, res) => {
  const itemId = Number(req.body.item_id);
  const quantity = Number(req.body.quantity);

  if (quantity <= 0) {
    db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(itemId, req.session.userId);
  } else {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?').run(
      quantity,
      itemId,
      req.session.userId
    );
  }

  res.redirect('/cart');
});

router.post('/remove', (req, res) => {
  const itemId = Number(req.body.item_id);
  db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(itemId, req.session.userId);
  res.redirect('/cart');
});

module.exports = router;
