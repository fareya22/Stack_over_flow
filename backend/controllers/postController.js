
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const minioClient = require('../config/minio');
const { v4: uuidv4 } = require('uuid');
const streamToString = require('stream-to-string'); 

exports.createPost = async (req, res) => {
  const { title, codeSnippet, language } = req.body;
  const file = req.file;

  try {
    let codeFileUrl = null;
    let uploadedFileUrl = null;

   
    if (codeSnippet) {
      const codeFileName = `${uuidv4()}.${language || 'txt'}`;
      await minioClient.putObject(
        process.env.MINIO_BUCKET,
        codeFileName,
        Buffer.from(codeSnippet),
        { 'Content-Type': 'text/plain' }
      );
      codeFileUrl = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${process.env.MINIO_BUCKET}/${codeFileName}`;
    }

  
    if (file) {
      const uploadedFileName = `${uuidv4()}_${file.originalname}`;
      await minioClient.putObject(
        process.env.MINIO_BUCKET,
        uploadedFileName,
        file.buffer
      );
      uploadedFileUrl = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${process.env.MINIO_BUCKET}/${uploadedFileName}`;
    }

   
    const author = await User.findById(req.userId).select('username');
    if (!author) {
      return res.status(400).json({ error: 'Author not found' });
    }
z
    const post = new Post({
      title,
      language: language || null,
      codeFileUrl,
      uploadedFileUrl,
      author: req.userId,
    });
    await post.save();

    
    const otherUsers = await User.find({ _id: { $ne: req.userId } });
    const notifications = otherUsers.map((user) => ({
      userId: user._id,
      postId: post._id,
      read: false,
    }));
    await Notification.insertMany(notifications);

  
    const io = req.app.get('io');
    io.emit('newPostNotification', {
      postId: post._id,
      title: post.title,
      authorUsername: author.username,
    });

    res.status(201).json(post);
  } catch (error) {
    console.error("Error in createPost:", error);
    res.status(500).json({ error: error.message });
  }
};


exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('author', 'username');
    res.json(posts);
  } catch (error) {
    console.error("Error in getPosts:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getPostById = async (req, res) => {
  const { postId } = req.params;
  try {
    const post = await Post.findById(postId).populate('author', 'username');
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    let codeContent = null;
    let uploadedFileContent = null;

    // Retrieve code file content if available
    if (post.codeFileUrl) {
      const codeFileName = post.codeFileUrl.split('/').pop();
      const codeFileStream = await minioClient.getObject(process.env.MINIO_BUCKET, codeFileName);
      codeContent = await streamToString(codeFileStream);
    }

    // Retrieve uploaded file content if available
    if (post.uploadedFileUrl) {
      const uploadedFileName = post.uploadedFileUrl.split('/').pop();
      const uploadedFileStream = await minioClient.getObject(process.env.MINIO_BUCKET, uploadedFileName);
      uploadedFileContent = await streamToString(uploadedFileStream);
    }

    res.json({
      post,
      codeContent,
      uploadedFileContent,
    });
  } catch (error) {
    console.error("Error in getPostById:", error);
    res.status(500).json({ error: error.message });
  }
};