// backend/server.js
require('dotenv').config(); // Load environment variables early
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for frontend (adjust origin as needed)
app.use(cors());

// Static and form parsing middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Configure file upload
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      cb(null, `resume-${Date.now()}${path.extname(file.originalname)}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    cb(null, allowed.includes(file.mimetype));
  }
});

// Email setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD
  }
});

// Handle form submission
app.post('/submit-application', upload.single('resume'), async (req, res) => {
  try {
    const { body, file } = req;
    if (!file) return res.status(400).json({ success: false, error: 'Resume file missing' });

    // Compose email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: `New Application: ${body.firstName} ${body.lastName}`,
      text: `Application Details:\n\n${JSON.stringify(body, null, 2)}`,
      attachments: [
        {
          filename: file.originalname,
          path: file.path
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    fs.unlinkSync(file.path); // delete after sending
    res.json({ success: true, message: 'Application submitted successfully!' });
  } catch (err) {
    console.error('Error:', err);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
