// sql-lab-seed.js
// A compact, dvdrental-flavoured sample database for the SQL Lab.
// Values are tuned so the worked examples in the modules return the stated
// results: 15 films across 5 distinct ratings, 10 customers (2 with NULL email).

window.SQL_LAB_SCHEMA = [
  { name: "actor",    rows: 10, cols: ["actor_id", "first_name", "last_name"] },
  { name: "category", rows: 8,  cols: ["category_id", "name"] },
  { name: "film",     rows: 15, cols: ["film_id", "title", "rating", "rental_duration", "rental_rate", "length", "release_year"] },
  { name: "film_category", rows: 15, cols: ["film_id", "category_id"] },
  { name: "country",  rows: 5,  cols: ["country_id", "country"] },
  { name: "city",     rows: 8,  cols: ["city_id", "city", "country_id"] },
  { name: "customer", rows: 10, cols: ["customer_id", "first_name", "last_name", "email", "city_id"] },
  { name: "payment",  rows: 22, cols: ["payment_id", "customer_id", "amount", "payment_date"] },
  { name: "rental",   rows: 14, cols: ["rental_id", "customer_id", "film_id", "rental_date", "return_date"] }
];

window.SQL_LAB_SEED = `
CREATE TABLE actor (actor_id INTEGER PRIMARY KEY, first_name TEXT, last_name TEXT);
INSERT INTO actor VALUES
 (1,'Penelope','Guiness'),(2,'Nick','Wahlberg'),(3,'Ed','Chase'),
 (4,'Jennifer','Davis'),(5,'Johnny','Lollobrigida'),(6,'Bette','Nicholson'),
 (7,'Grace','Mostel'),(8,'Matthew','Johansson'),(9,'Joe','Swank'),(10,'Christian','Gable');

CREATE TABLE category (category_id INTEGER PRIMARY KEY, name TEXT);
INSERT INTO category VALUES
 (1,'Action'),(2,'Comedy'),(3,'Drama'),(4,'Horror'),
 (5,'Documentary'),(6,'Family'),(7,'Sci-Fi'),(8,'Music');

CREATE TABLE film (
  film_id INTEGER PRIMARY KEY, title TEXT, rating TEXT,
  rental_duration INTEGER, rental_rate REAL, length INTEGER, release_year INTEGER
);
INSERT INTO film VALUES
 (1,'Academy Dinosaur','G',6,0.99,86,2006),
 (2,'Ace Goldfinger','G',3,4.99,48,2006),
 (3,'Adaptation Holes','G',7,2.99,50,2006),
 (4,'Affair Prejudice','PG',5,2.99,117,2006),
 (5,'African Egg','PG',6,2.99,130,2006),
 (6,'Agent Truman','PG',3,2.99,169,2006),
 (7,'Airplane Sierra','PG-13',6,4.99,62,2006),
 (8,'Airport Pollock','PG-13',6,4.99,54,2006),
 (9,'Alabama Devil','PG-13',3,2.99,114,2006),
 (10,'Aladdin Calendar','R',6,4.99,63,2006),
 (11,'Alamo Videotape','R',6,0.99,126,2006),
 (12,'Alaska Phantom','R',5,0.99,136,2006),
 (13,'Ali Forever','NC-17',4,4.99,150,2006),
 (14,'Alice Fantasia','NC-17',6,0.99,94,2006),
 (15,'Alien Center','NC-17',5,2.99,46,2006);

CREATE TABLE film_category (film_id INTEGER, category_id INTEGER);
INSERT INTO film_category VALUES
 (1,5),(2,1),(3,6),(4,3),(5,5),(6,1),(7,2),(8,2),
 (9,4),(10,7),(11,1),(12,7),(13,3),(14,6),(15,7);

CREATE TABLE country (country_id INTEGER PRIMARY KEY, country TEXT);
INSERT INTO country VALUES
 (1,'India'),(2,'United States'),(3,'Japan'),(4,'Brazil'),(5,'Germany');

CREATE TABLE city (city_id INTEGER PRIMARY KEY, city TEXT, country_id INTEGER);
INSERT INTO city VALUES
 (1,'Mumbai',1),(2,'Pune',1),(3,'New York',2),(4,'Austin',2),
 (5,'Tokyo',3),(6,'Osaka',3),(7,'Sao Paulo',4),(8,'Berlin',5);

CREATE TABLE customer (
  customer_id INTEGER PRIMARY KEY, first_name TEXT, last_name TEXT, email TEXT, city_id INTEGER
);
INSERT INTO customer VALUES
 (1,'Mary','Smith','mary.smith@example.com',1),
 (2,'Patricia','Johnson','patricia.j@example.com',3),
 (3,'Linda','Williams',NULL,5),
 (4,'Barbara','Jones','barbara.jones@example.com',2),
 (5,'Elizabeth','Brown','liz.brown@example.com',4),
 (6,'Jennifer','Davis',NULL,7),
 (7,'Maria','Miller','maria.miller@example.com',6),
 (8,'Susan','Wilson','susan.wilson@example.com',8),
 (9,'Margaret','Moore','m.moore@example.com',1),
 (10,'Dorothy','Taylor','dorothy.t@example.com',3);

CREATE TABLE payment (
  payment_id INTEGER PRIMARY KEY, customer_id INTEGER, amount REAL, payment_date TEXT
);
INSERT INTO payment VALUES
 (1,1,4.99,'2007-02-15'),(2,1,2.99,'2007-02-18'),(3,1,4.99,'2007-03-01'),
 (4,2,0.99,'2007-02-16'),(5,2,4.99,'2007-03-04'),
 (6,3,9.99,'2007-02-20'),(7,3,2.99,'2007-03-09'),(8,3,4.99,'2007-03-22'),
 (9,4,0.99,'2007-02-21'),(10,4,0.99,'2007-03-11'),
 (11,5,4.99,'2007-02-22'),(12,5,7.99,'2007-03-14'),(13,5,2.99,'2007-03-28'),
 (14,6,4.99,'2007-02-25'),
 (15,7,2.99,'2007-02-26'),(16,7,4.99,'2007-03-18'),
 (17,8,0.99,'2007-02-27'),(18,8,2.99,'2007-03-19'),(19,8,4.99,'2007-03-30'),
 (20,9,4.99,'2007-03-02'),
 (21,10,2.99,'2007-03-05'),(22,10,4.99,'2007-03-25');

CREATE TABLE rental (
  rental_id INTEGER PRIMARY KEY, customer_id INTEGER, film_id INTEGER,
  rental_date TEXT, return_date TEXT
);
INSERT INTO rental VALUES
 (1,1,1,'2007-02-15','2007-02-19'),(2,1,5,'2007-03-01','2007-03-06'),
 (3,2,2,'2007-02-16','2007-02-19'),(4,3,7,'2007-02-20',NULL),
 (5,3,10,'2007-03-09','2007-03-14'),(6,4,3,'2007-02-21','2007-02-28'),
 (7,5,11,'2007-02-22','2007-02-27'),(8,5,13,'2007-03-14',NULL),
 (9,6,4,'2007-02-25','2007-03-01'),(10,7,8,'2007-02-26','2007-03-01'),
 (11,8,9,'2007-02-27','2007-03-02'),(12,8,15,'2007-03-30',NULL),
 (13,9,6,'2007-03-02','2007-03-05'),(14,10,12,'2007-03-05','2007-03-12');
`;
