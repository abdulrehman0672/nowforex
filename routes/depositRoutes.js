import express from 'express';
import User from '../models/user.js';
import { protect } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();

// Create uploads directory if it doesn't exist
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
        return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
};

const upload = multer({ 
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Apply protect middleware to all routes
router.use(protect);

router.post('/deposit', upload.single('proofImage'), async (req, res) => {
    try {
      console.log('Uploaded file:', {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path
      });
  
      const { amount, method, transactionId } = req.body;
      
      // Validate all fields
      if (!amount || !method || !transactionId || !req.file) {
        return res.status(400).json({ message: 'All fields including proof image are required' });
      }
  
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: 'User not found' });
  
      // Create the deposit object first
      const depositData = {
        amount: parseFloat(amount),
        method,
        transactionId,
        proofImage: req.file.filename, // Store only the filename
        status: 'pending',
        createdAt: new Date()
      };
  
      // Add to user's depositRequests
      user.depositRequests.push(depositData);
      await user.save();
  
      console.log('New deposit saved:', depositData);
  
      res.status(201).json({
        message: 'Deposit request submitted',
        deposit: depositData
      });
    } catch (error) {
      console.error('Deposit error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

// Get deposit history
router.get('/history', async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('depositRequests');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user.depositRequests);
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/proof/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ message: 'Image not found' });
    }
});


export default router;