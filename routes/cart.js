const express = require('express');
const { pool } = require('../db/database');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

async function getCartItems(userId) {
  const { rows } = await pool.query(
    `SELECT cart_items.id, cart_items.quantity, products.id AS product_id,
            products.name, products.price_cents, products.image_url, products.stock_qty
     FROM cart_items
     JOIN products ON products.id = cart_items.product_id
     WHERE cart_items.user_id = $1
     ORDER BY cart_items.id`,
    [userId]
  );
  return rows;
}

router.get('/', async (req, res, next) => {
  try {
    const items = await getCartItems(req.session.userId);
    const subtotalCents = items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
    res.render('cart/index', { items, subtotalCents });
  } catch (err) {
    next(err);
  }
});

router.post('/add', async (req, res, next) => {
  try {
    const productId = Number(req.body.product_id);
    const quantity = Math.max(1, Number(req.body.quantity) || 1);

    const { rows: productRows } = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
    const product = productRows[0];
    if (!product) {
      return res.status(404).render('errors/404');
    }

    const { rows: existingRows } = await pool.query(
      'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [req.session.userId, productId]
    );
    const existing = existingRows[0];

    if (existing) {
      const newQty = Math.min(existing.quantity + quantity, product.stock_qty);
      await pool.query('UPDATE cart_items SET quantity = $1 WHERE id = $2', [newQty, existing.id]);
    } else {
      const qty = Math.min(quantity, product.stock_qty);
      await pool.query(
        'INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)',
        [req.session.userId, productId, qty]
      );
    }

    res.redirect('/cart');
  } catch (err) {
    next(err);
  }
});

router.post('/update', async (req, res, next) => {
  try {
    const itemId = Number(req.body.item_id);
    const quantity = Number(req.body.quantity);

    if (quantity <= 0) {
      await pool.query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [itemId, req.session.userId]);
    } else {
      await pool.query(
        'UPDATE cart_items SET quantity = $1 WHERE id = $2 AND user_id = $3',
        [quantity, itemId, req.session.userId]
      );
    }

    res.redirect('/cart');
  } catch (err) {
    next(err);
  }
});

router.post('/remove', async (req, res, next) => {
  try {
    const itemId = Number(req.body.item_id);
    await pool.query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [itemId, req.session.userId]);
    res.redirect('/cart');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
