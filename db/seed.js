const db = require('./database');

const categories = ['Electronics', 'Books', 'Home & Kitchen', 'Clothing', 'Sports & Outdoors'];

const products = [
  { name: 'Wireless Mouse', category: 'Electronics', description: 'Ergonomic 2.4GHz wireless mouse with USB receiver.', price_cents: 1999, stock_qty: 60, image_url: 'https://picsum.photos/seed/mouse/400/300' },
  { name: 'Mechanical Keyboard', category: 'Electronics', description: 'Tactile mechanical keyboard with RGB backlighting.', price_cents: 5999, stock_qty: 35, image_url: 'https://picsum.photos/seed/keyboard/400/300' },
  { name: 'Noise-Cancelling Headphones', category: 'Electronics', description: 'Over-ear headphones with active noise cancellation.', price_cents: 8999, stock_qty: 20, image_url: 'https://picsum.photos/seed/headphones/400/300' },
  { name: 'The Pragmatic Programmer', category: 'Books', description: 'Classic guide to becoming a better software developer.', price_cents: 2499, stock_qty: 45, image_url: 'https://picsum.photos/seed/pragprog/400/300' },
  { name: 'Designing Data-Intensive Applications', category: 'Books', description: 'Deep dive into the systems behind reliable, scalable apps.', price_cents: 3299, stock_qty: 30, image_url: 'https://picsum.photos/seed/ddia/400/300' },
  { name: 'SQL Cookbook', category: 'Books', description: 'Practical recipes for solving problems with SQL.', price_cents: 2899, stock_qty: 40, image_url: 'https://picsum.photos/seed/sqlcookbook/400/300' },
  { name: 'French Press Coffee Maker', category: 'Home & Kitchen', description: '34oz stainless steel French press.', price_cents: 2799, stock_qty: 25, image_url: 'https://picsum.photos/seed/frenchpress/400/300' },
  { name: 'Ceramic Knife Set', category: 'Home & Kitchen', description: '5-piece ceramic kitchen knife set with sheaths.', price_cents: 3499, stock_qty: 18, image_url: 'https://picsum.photos/seed/knives/400/300' },
  { name: 'Cotton Crewneck T-Shirt', category: 'Clothing', description: 'Soft 100% cotton crewneck, available in multiple colors.', price_cents: 1499, stock_qty: 100, image_url: 'https://picsum.photos/seed/tshirt/400/300' },
  { name: 'Fleece Zip Hoodie', category: 'Clothing', description: 'Warm mid-weight fleece hoodie with zip front.', price_cents: 3999, stock_qty: 50, image_url: 'https://picsum.photos/seed/hoodie/400/300' },
  { name: 'Yoga Mat', category: 'Sports & Outdoors', description: 'Non-slip 6mm yoga mat with carrying strap.', price_cents: 2299, stock_qty: 40, image_url: 'https://picsum.photos/seed/yogamat/400/300' },
  { name: 'Insulated Water Bottle', category: 'Sports & Outdoors', description: '32oz stainless steel bottle, keeps drinks cold 24 hours.', price_cents: 2199, stock_qty: 55, image_url: 'https://picsum.photos/seed/bottle/400/300' }
];

function seed() {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM products').get();
  if (existing.count > 0) {
    console.log(`Database already has ${existing.count} products — skipping seed.`);
    return;
  }

  const insertCategory = db.prepare('INSERT INTO categories (name) VALUES (?)');
  const insertProduct = db.prepare(`
    INSERT INTO products (category_id, name, description, price_cents, image_url, stock_qty)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const seedTxn = db.transaction(() => {
    const categoryIds = {};
    for (const name of categories) {
      const info = insertCategory.run(name);
      categoryIds[name] = info.lastInsertRowid;
    }

    for (const p of products) {
      insertProduct.run(
        categoryIds[p.category],
        p.name,
        p.description,
        p.price_cents,
        p.image_url,
        p.stock_qty
      );
    }
  });

  seedTxn();
  console.log(`Seeded ${categories.length} categories and ${products.length} products.`);
}

seed();
