# SQL Shop

**Live demo:** [sql-shop.onrender.com](https://sql-shop.onrender.com)
(free-tier hosting — the first request after a few minutes of inactivity can
take 30–60s to wake up)

A mini e-commerce website built to practice relational database design and SQL — user accounts, a product catalog, a persistent cart, and a transactional checkout flow, all backed by PostgreSQL.

## Features

- **Product catalog** — browse all products or filter by category
- **User accounts** — register and log in with hashed passwords (scrypt, no plaintext storage)
- **Persistent cart** — add, update, and remove items; cart is tied to the logged-in user, not a cookie
- **Checkout** — placing an order runs as a single SQL transaction: it creates the order and its line items, decrements product stock, and clears the cart. If anything fails (e.g. insufficient stock), the whole transaction rolls back. The stock check locks the relevant `products` rows with `FOR UPDATE`, so two concurrent checkouts can't both read the same stock and oversell it
- **Order history** — view past orders and their line-item detail
- **Order cancellation** — cancel a still-`placed` order and its items are returned to stock, also inside a transaction. Locks the order row with `FOR UPDATE` so double-clicking cancel can't restock the same order twice

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** PostgreSQL, via [`pg`](https://node-postgres.com/) — hosted on [Neon](https://neon.tech) (serverless Postgres, free tier)
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

Requires Node.js 18+ and a Postgres database — [Neon](https://neon.tech) has a
free tier with no credit card required and works well for this.

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL with your Postgres connection string
npm run seed            # one-time: creates the schema and loads sample categories/products
npm start
```

Then visit **http://localhost:3000**.

## Deployment

The live demo runs on **Render** (`render.yaml`) with its Postgres database
on **Neon**, both free tier. `DATABASE_URL` and `SESSION_SECRET` are read
from environment variables (`.env` locally, Render's dashboard in
production) — no code changes needed between dev and prod.

## Project Structure

```
db/           schema.sql, database connection, seed script
middleware/   auth-guard middleware
routes/       auth, products, cart, orders
views/        EJS templates
public/       static CSS
server.js     app entry point
```
