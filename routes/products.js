const express = require('express');
const { pool } = require('../db/database');

const router = express.Router();

// Lists all products, optionally filtered to a single category via ?category=.
router.get('/', async (req, res, next) => {
  try {
    const { rows: categories } = await pool.query('SELECT * FROM categories ORDER BY name');
    const { category } = req.query;

    let products;
    if (category) {
      ({ rows: products } = await pool.query(
        `SELECT products.*, categories.name AS category_name
         FROM products
         JOIN categories ON categories.id = products.category_id
         WHERE categories.name = $1
         ORDER BY products.name`,
        [category]
      ));
    } else {
      ({ rows: products } = await pool.query(
        `SELECT products.*, categories.name AS category_name
         FROM products
         JOIN categories ON categories.id = products.category_id
         ORDER BY products.name`
      ));
    }

    res.render('products/index', { products, categories, activeCategory: category || null });
  } catch (err) {
    next(err);
  }
});

// Shows a single product's detail page, or 404s if the id doesn't exist.
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT products.*, categories.name AS category_name
       FROM products
       JOIN categories ON categories.id = products.category_id
       WHERE products.id = $1`,
      [req.params.id]
    );
    const product = rows[0];

    if (!product) {
      return res.status(404).render('errors/404');
    }

    res.render('products/show', { product });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
