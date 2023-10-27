DROP TABLE IF EXISTS images;
CREATE TABLE IF NOT EXISTS images (
  id integer PRIMARY KEY AUTOINCREMENT,
  category text NOT NULL,
  uuid text NOT NULL,
  create_time datetime NOT NULL
);
