const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  const { category } = req.query;

  let products;
  if (category) {
    products = db
      .prepare(
        `SELECT products.*, categories.name AS category_name
         FROM products
         JOIN categories ON categories.id = products.category_id
         WHERE categories.name = ?
         ORDER BY products.name`
      )
      .all(category);
  } else {
    products = db
      .prepare(
        `SELECT products.*, categories.name AS category_name
         FROM products
         JOIN categories ON categories.id = products.category_id
         ORDER BY products.name`
      )
      .all();
  }

  res.render('products/index', { products, categories, activeCategory: category || null });
});

router.get('/:id', (req, res) => {
  const product = db
    .prepare(
      `SELECT products.*, categories.name AS category_name
       FROM products
       JOIN categories ON categories.id = products.category_id
       WHERE products.id = ?`
    )
    .get(req.params.id);

  if (!product) {
    return res.status(404).render('errors/404');
  }

  res.render('products/show', { product });
});

module.exports = router;
