# SQL Shop

A mini e-commerce website built to practice relational database design and SQL — user accounts, a product catalog, a persistent cart, and a transactional checkout flow, all backed by SQLite.

## Features

- **Product catalog** — browse all products or filter by category
- **User accounts** — register and log in with hashed passwords (scrypt, no plaintext storage)
- **Persistent cart** — add, update, and remove items; cart is tied to the logged-in user, not a cookie
- **Checkout** — placing an order runs as a single SQL transaction: it creates the order and its line items, decrements product stock, and clears the cart. If anything fails (e.g. insufficient stock), the whole transaction rolls back
- **Order history** — view past orders and their line-item detail

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** SQLite via Node's built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html) module (no native build step required)
- **Views:** EJS (server-rendered), plain CSS

## Database Schema

Six tables, related with foreign keys and constrained with `CHECK`s:

```
users            categories          products
--------         --------            --------
id (PK)          id (PK)             id (PK)
name             name (unique)       category_id (FK -> categories)
email (unique)                       name
password_hash                        description
created_at                           price_cents
                                      image_url
                                      stock_qty

cart_items                orders                order_items
--------                  --------              --------
id (PK)                   id (PK)               id (PK)
user_id (FK -> users)     user_id (FK -> users)  order_id (FK -> orders)
product_id (FK -> products) status               product_id (FK -> products)
quantity                  total_cents            quantity
                          created_at             unit_price_cents
```

- `order_items.unit_price_cents` captures the price at the time of purchase, independent of later price changes on `products`.
- `cart_items` has a `UNIQUE(user_id, product_id)` constraint, so adding the same product twice increases its quantity instead of duplicating a row.

## Getting Started

Requires Node.js 22.5+ (for the built-in `node:sqlite` module).

```bash
npm install
npm run seed   # one-time: creates db/store.db and loads sample categories/products
npm start
```

Then visit **http://localhost:3000**.

## Project Structure

```
db/           schema.sql, database connection, seed script
middleware/   auth-guard middleware
routes/       auth, products, cart, orders
views/        EJS templates
public/       static CSS
server.js     app entry point
```
