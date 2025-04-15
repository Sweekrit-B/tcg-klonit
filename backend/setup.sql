-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL
);

-- Insert sample users if they don't exist
INSERT INTO users (name, email)
SELECT 'Alice', 'alice@example.com'
WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1);

INSERT INTO users (name, email)
SELECT 'Bob', 'bob@example.com'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='bob@example.com');

INSERT INTO users (name, email)
SELECT 'Charlie', 'charlie@example.com'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='charlie@example.com');

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL
);

-- Insert sample products if they don't exist
INSERT INTO products (name, price)
SELECT 'Laptop', 1299.99
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);

INSERT INTO products (name, price)
SELECT 'Smartphone', 699.99
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Smartphone');

INSERT INTO products (name, price)
SELECT 'Headphones', 149.99
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Headphones'); 