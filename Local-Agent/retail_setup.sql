-- Create retail schema tables
CREATE TABLE IF NOT EXISTS customer_profiles (
  customer_id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone_number VARCHAR(20),
  address VARCHAR(255),
  account_creation_date DATE
);

CREATE TABLE IF NOT EXISTS products (
  product_id SERIAL PRIMARY KEY,
  product_name VARCHAR(255),
  description TEXT,
  price DECIMAL(10, 2)
);

CREATE TABLE IF NOT EXISTS sales (
  transaction_id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customer_profiles(customer_id),
  product_id INT REFERENCES products(product_id),
  order_date TIMESTAMP,
  quantity INT,
  total_amount DECIMAL(10, 2)
);

CREATE TABLE IF NOT EXISTS customer_engagement (
  case_id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customer_profiles(customer_id),
  case_open_date TIMESTAMP,
  case_close_date TIMESTAMP,
  case_description TEXT,
  resolution TEXT,
  agent_id INT
);

-- Insert sample customer data
INSERT INTO customer_profiles (email, first_name, last_name, phone_number, address, account_creation_date)
SELECT * FROM (VALUES
  ('customer1@example.com', 'John', 'Smith', '555-0101', '123 Main St', '2023-01-01'::DATE),
  ('customer2@example.com', 'Jane', 'Doe', '555-0102', '456 Oak Ave', '2023-01-02'::DATE),
  ('customer3@example.com', 'Bob', 'Johnson', '555-0103', '789 Pine Rd', '2023-01-03'::DATE),
  ('customer4@example.com', 'Alice', 'Brown', '555-0104', '321 Elm St', '2023-01-04'::DATE),
  ('customer5@example.com', 'Charlie', 'Davis', '555-0105', '654 Maple Dr', '2023-01-05'::DATE),
  ('customer6@example.com', 'Eva', 'Wilson', '555-0106', '987 Cedar Ln', '2023-01-06'::DATE),
  ('customer7@example.com', 'Frank', 'Miller', '555-0107', '147 Birch Rd', '2023-01-07'::DATE),
  ('customer8@example.com', 'Grace', 'Taylor', '555-0108', '258 Spruce Ave', '2023-01-08'::DATE),
  ('customer9@example.com', 'Henry', 'Anderson', '555-0109', '369 Willow St', '2023-01-09'::DATE),
  ('customer10@example.com', 'Ivy', 'Thomas', '555-0110', '741 Pine Ct', '2023-01-10'::DATE)
) AS v(email, first_name, last_name, phone_number, address, account_creation_date)
WHERE NOT EXISTS (SELECT 1 FROM customer_profiles);

-- Insert sample product data
INSERT INTO products (product_name, description, price)
SELECT * FROM (VALUES
  ('Laptop Pro', 'High-performance laptop', 1299.99),
  ('Smartphone X', 'Latest smartphone model', 899.99),
  ('Wireless Earbuds', 'Premium wireless earbuds', 199.99),
  ('Smart Watch', 'Fitness tracking smartwatch', 299.99),
  ('Tablet Ultra', '12-inch tablet with stylus', 699.99),
  ('Desktop PC', 'Gaming desktop computer', 1499.99),
  ('Camera Pro', 'Professional DSLR camera', 999.99),
  ('Monitor 4K', '32-inch 4K monitor', 499.99),
  ('Printer All-in-One', 'Print, scan, and copy', 249.99),
  ('Gaming Console', 'Latest gaming console', 399.99)
) AS v(product_name, description, price)
WHERE NOT EXISTS (SELECT 1 FROM products);

-- Insert sample sales data
INSERT INTO sales (customer_id, product_id, order_date, quantity, total_amount)
SELECT 
  c.customer_id,
  p.product_id,
  NOW() - (INTERVAL '1 day' * FLOOR(RANDOM() * 30)),
  FLOOR(RANDOM() * 3) + 1,
  p.price * (FLOOR(RANDOM() * 3) + 1)
FROM 
  customer_profiles c
  CROSS JOIN products p 
WHERE 
  RANDOM() < 0.3
  AND NOT EXISTS (SELECT 1 FROM sales);

-- Insert sample customer engagement data
INSERT INTO customer_engagement (
  customer_id, 
  case_open_date, 
  case_close_date, 
  case_description, 
  resolution, 
  agent_id
)
SELECT
  customer_id,
  NOW() - (INTERVAL '1 day' * FLOOR(RANDOM() * 30)),
  CASE WHEN RANDOM() < 0.8 
    THEN NOW() - (INTERVAL '1 day' * FLOOR(RANDOM() * 15))
    ELSE NULL 
  END,
  CASE FLOOR(RANDOM() * 3)
    WHEN 0 THEN 'Product inquiry'
    WHEN 1 THEN 'Technical support'
    ELSE 'Billing question'
  END,
  CASE WHEN RANDOM() < 0.8 
    THEN 'Issue resolved'
    ELSE NULL 
  END,
  FLOOR(RANDOM() * 5) + 1
FROM 
  customer_profiles
WHERE 
  RANDOM() < 0.5
  AND NOT EXISTS (SELECT 1 FROM customer_engagement); 