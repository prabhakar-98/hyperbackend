const express = require('express');
const cors = require('cors');
const app = express();
const Post = require('./schema');
const mongoose = require('mongoose');
require('dotenv').config();
const{ S3Client, PutObjectCommand, GetObjectCommand}= require('@aws-sdk/client-s3');
const{ getSignedUrl }=require('@aws-sdk/s3-request-presigner');

app.use(cors({ credentials: true, origin:'*'})); 
app.use(express.urlencoded({ extended: true })); 
app.use(express.json()); 

const multer = require('multer');
const upload = multer();

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  const BUCKET_NAME = process.env.S3_BUCKET_NAME;

app.post('/s3/unsigned-url', upload.none(), async (req, res) => {
  try {
    
    const { key } = req.body;
    console.log(key)
    if (key) {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      const presigned = await getSignedUrl(s3, command,{ expiresIn: 3600 });
       
        res.json({ url: presigned });
    }
    
  
  } catch (error) {
    console.log(error.message ) 
    res.status(500).json({ error: error.message });
  }
});
app.get('/s3/presigned-url', async (req, res) => {
  try {
    
    const { key } = req.query;
    console.log(key)
    if (key) {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      const presigned = await getSignedUrl(s3, command);
    
        res.json({ url: presigned });
    }
    
  
  } catch (error) {
   
    res.status(500).json({ error: error.message });
  }
});


mongoose.connect(process.env.MONGODB, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected',))
  .catch(err => console.log(err));

app.post('/post', upload.none(), async (req, res) => {
    try {
        const { title, content } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        // Create a new Post instance
        const newPost = new Post({ title, content });

        // Save to MongoDB
        await newPost.save();

        res.status(201).json({ message: 'Post created successfully!', post: newPost });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/posts', async (req, res) => {
    try {
        const posts = await Post.find(); // Retrieve all posts from MongoDB
        res.status(200).json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/posts/:id', async (req, res) => {
  try {
      console.log(req.params.id);
      const post = await Post.findById(req.params.id); // Find post by ID

      if (!post) {
          return res.status(404).json({ error: 'Post not found' });
      }
      res.status(200).json(post);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(process.env.PORT, () => {
    console.log(`Express server is running on http://localhost:${process.env.PORT}`);
});
