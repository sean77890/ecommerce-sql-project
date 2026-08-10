const express = require('express');
const db = require('../db/database');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

router.post('/checkout', (req, res) => {
  const userId = req.session.userId;

  const checkoutTxn = db.transaction(() => {
    const items = db
      .prepare(
        `SELECT cart_items.id AS cart_item_id, cart_items.quantity, products.id AS product_id,
                products.name, products.price_cents, products.stock_qty
         FROM cart_items
         JOIN products ON products.id = cart_items.product_id
         WHERE cart_items.user_id = ?`
      )
      .all(userId);

    if (items.length === 0) {
      throw new Error('EMPTY_CART');
    }

    for (const item of items) {
      if (item.quantity > item.stock_qty) {
        throw new Error(`OUT_OF_STOCK:${item.name}`);
      }
    }

    const totalCents = items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);

    const orderInfo = db
      .prepare('INSERT INTO orders (user_id, total_cents) VALUES (?, ?)')
      .run(userId, totalCents);
    const orderId = orderInfo.lastInsertRowid;

    const insertOrderItem = db.prepare(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
       VALUES (?, ?, ?, ?)`
    );
    const decrementStock = db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?');

    for (const item of items) {
      insertOrderItem.run(orderId, item.product_id, item.quantity, item.price_cents);
      decrementStock.run(item.quantity, item.product_id);
    }

    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);

    return orderId;
  });

  try {
    const orderId = checkoutTxn();
    res.redirect(`/orders/${orderId}`);
  } catch (err) {
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
    throw err;
  }
});

router.get('/', (req, res) => {
  const orders = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.session.userId);
  res.render('orders/index', { orders });
});

router.get('/:id', (req, res) => {
  const order = db
    .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.session.userId);

  if (!order) {
    return res.status(404).render('errors/404');
  }

  const items = db
    .prepare(
      `SELECT order_items.*, products.name
       FROM order_items
       JOIN products ON products.id = order_items.product_id
       WHERE order_id = ?`
    )
    .all(order.id);

  res.render('orders/show', { order, items });
});

module.exports = router;
