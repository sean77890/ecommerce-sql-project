const express = require('express');
const { pool } = require('../db/database');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

router.post('/checkout', async (req, res, next) => {
  const userId = req.session.userId;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the involved product rows so two concurrent checkouts can't both
    // read the same stock_qty and oversell it.
    const { rows: items } = await client.query(
      `SELECT cart_items.id AS cart_item_id, cart_items.quantity, products.id AS product_id,
              products.name, products.price_cents, products.stock_qty
       FROM cart_items
       JOIN products ON products.id = cart_items.product_id
       WHERE cart_items.user_id = $1
       FOR UPDATE OF products`,
      [userId]
    );

    if (items.length === 0) {
      throw new Error('EMPTY_CART');
    }

    for (const item of items) {
      if (item.quantity > item.stock_qty) {
        throw new Error(`OUT_OF_STOCK:${item.name}`);
      }
    }

    const totalCents = items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);

    const { rows: orderRows } = await client.query(
      'INSERT INTO orders (user_id, total_cents) VALUES ($1, $2) RETURNING id',
      [userId, totalCents]
    );
    const orderId = orderRows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.quantity, item.price_cents]
      );
      await client.query('UPDATE products SET stock_qty = stock_qty - $1 WHERE id = $2', [
        item.quantity,
        item.product_id
      ]);
    }

    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

    await client.query('COMMIT');
    res.redirect(`/orders/${orderId}`);
  } catch (err) {
    await client.query('ROLLBACK');

    if (err.message === 'EMPTY_CART') {
      return res.redirect('/cart');
    }
    if (err.message.startsWith('OUT_OF_STOCK')) {
      const productName = err.message.split(':')[1];
      return res.status(400).render('cart/index', {
        items: [],
        subtotalCents: 0,
        error: `Not enough stock for "${productName}". Please update your cart.`
      });
    }
    next(err);
  } finally {
    client.release();
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { rows: orders } = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.session.userId]
    );
    res.render('orders/index', { orders });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows: orderRows } = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.session.userId]
    );
    const order = orderRows[0];

    if (!order) {
      return res.status(404).render('errors/404');
    }

    const { rows: items } = await pool.query(
      `SELECT order_items.*, products.name
       FROM order_items
       JOIN products ON products.id = order_items.product_id
       WHERE order_id = $1`,
      [order.id]
    );

    res.render('orders/show', { order, items });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
