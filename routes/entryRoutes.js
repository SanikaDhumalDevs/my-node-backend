const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { addEntry , deleteExpiredEntries} = require('../controllers/entryController');


// Configure multer with disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'tmp'); // Folder where uploaded files will be stored
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

// Route to handle ad entry submission
router.post('/add', upload.single('bill'), addEntry);
// Route to delete expired entries for a specific user
router.post('/delete-expired', deleteExpiredEntries);

module.exports = router;