
const express = require('express');
const { createPost, getPosts, getPostById } = require('../controllers/postController'); 
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('multer')(); 

const router = express.Router();


router.post('/create', authMiddleware, upload.single('file'), createPost); 
router.get('/', authMiddleware, getPosts);

router.get('/:postId', authMiddleware, getPostById); 

module.exports = router;
