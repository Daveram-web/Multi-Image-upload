const express = require('express');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql2');
const fs = require('fs');
const cros = require('cors');

const app = express();
app.use(express.json());
app.use(cros());

const port = 3000;

// MySQL connection setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'test'
});

// Configure multer for storing images locally
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Ensure 'uploads' folder exists
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// Route to upload images
app.post('/upload', upload.array('images'), (req, res) => {
  const { name } = req.body;

  if (!req.files || req.files.length === 0) {
    return res.status(400).send('No files uploaded.');
  }

  const fileUrls = req.files.map(file => `/uploads/${file.filename}`);

  // Save image details to MySQL
  const sql = 'INSERT INTO images (name, url) VALUES ?';
  const values = fileUrls.map(url => [name, url]);

  db.query(sql, [values], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error.');
    }
    res.send('Images uploaded and URLs saved successfully.');
  });
});

// Route to serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route to fetch unique names from the images table
app.get('/names', (req, res) => {
  const sql = 'SELECT DISTINCT name FROM images';  
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error.');
    }
    res.json(results);  // Send the list of unique names as JSON
  });
});

// Route to fetch images by name
app.get('/images/by-name/:name', (req, res) => {
  const { name } = req.params;
  const sql = 'SELECT * FROM images WHERE name = ?';
  db.query(sql, [name], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error.');
    }
    res.json(results);  // Send images as JSON
  });
});

// Delete image by ID
app.delete('/image/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM images WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).send('Error deleting image.');
    if (result.affectedRows === 0) return res.status(404).send('Image not found.');
    res.send('Image deleted successfully.');
  });
});

// Start server
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
