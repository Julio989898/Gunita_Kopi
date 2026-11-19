-- Gunita KOPI database (MySQL 8 / MariaDB)
CREATE DATABASE IF NOT EXISTS gunita_kopi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gunita_kopi;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(8,2) NOT NULL,
  image_url VARCHAR(255),
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  status ENUM('pending','preparing','ready','completed','cancelled') NOT NULL DEFAULT 'pending',
  order_type ENUM('dine_in','takeaway') NOT NULL DEFAULT 'takeaway',
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(8,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  user_id INT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method ENUM('cash','gcash','card') NOT NULL DEFAULT 'cash',
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  image_url VARCHAR(255)
);

CREATE TABLE team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(100),
  photo_url VARCHAR(255)
);

CREATE TABLE gallery_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  image_url VARCHAR(255) NOT NULL,
  caption VARCHAR(150),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data (matches the menu on the website)
INSERT INTO categories (name) VALUES ('Hot Coffee'),('Iced'),('Pastries');

INSERT INTO products (category_id,name,description,price,is_featured) VALUES
(1,'Signature Latte','Espresso with steamed milk and a hint of caramel.',120,1),
(1,'Spanish Brew','Sweetened with condensed milk, served hot.',140,1),
(2,'Cold Brew','Steeped for 18 hours and served over ice.',130,1),
(1,'Americano','Espresso with hot water.',100,0),
(1,'Cappuccino','Equal parts espresso, milk and foam.',130,0),
(3,'Ensaymada','Soft, buttery, topped with cheese and sugar.',70,0);

INSERT INTO services (title,description) VALUES
('Dine-in','Stay a while. Cozy seating, free Wi-Fi and fresh drinks made to order.'),
('Takeaway','Order ahead and pick up your drink without the wait.'),
('Events and catering','Coffee service for meetings, birthdays and small gatherings.');

-- Example query: featured drinks for the home page
-- SELECT p.name, p.description, p.price FROM products p WHERE p.is_featured = 1 AND p.is_available = 1;

-- Default admin account: admin@gunitakopi.ph / admin12345  (change the password after first login)
INSERT INTO users (name,email,password_hash,role) VALUES ('Admin','admin@gunitakopi.ph','$2y$10$RJGVw9CWoR9WF3gjENuCfeepsdO4YGpHqQnqNNsWl.xWFWTUXrSWK','admin');

-- Admin transactions view: what was bought, when, and how much
-- SELECT p.id, u.name, GROUP_CONCAT(CONCAT(oi.quantity,' x ',pr.name) SEPARATOR ', ') AS items, p.amount, p.method, p.paid_at
-- FROM payments p LEFT JOIN users u ON u.id=p.user_id JOIN order_items oi ON oi.order_id=p.order_id JOIN products pr ON pr.id=oi.product_id GROUP BY p.id ORDER BY p.paid_at DESC;

-- Buy button flow: when a buyer presses Buy, save the payment and mark the order as completed (one transaction).
-- START TRANSACTION;
--   INSERT INTO payments (order_id, user_id, amount, method) VALUES (:order_id, :user_id, :total, :method);
--   UPDATE orders SET status = 'completed' WHERE id = :order_id AND status <> 'cancelled';
-- COMMIT;
