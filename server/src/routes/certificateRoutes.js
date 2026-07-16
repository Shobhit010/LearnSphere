const express = require('express');
const { verifyCertificate } = require('../controllers/certificateController');

const router = express.Router();

// Public route to verify certificates
router.get('/verify/:certificateId', verifyCertificate);

module.exports = router;
