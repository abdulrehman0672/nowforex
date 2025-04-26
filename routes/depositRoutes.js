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
        const { amount, method, transactionId } = req.body;
        const proofImage = req.file ? req.file.filename : null;

        // Validation checks
        if (!amount || !method || !transactionId || !proofImage) {
            return res.status(400).json({ 
                message: 'All fields are required, including proof image' 
            });
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ 
                message: 'Amount must be a positive number' 
            });
        }

        // Find user and add deposit request
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.depositRequests.push({
            amount: parsedAmount,
            method,
            transactionId,
            proofImage,
            status: 'pending'
        });

        await user.save();

        res.status(201).json({
            message: 'Deposit request submitted for admin approval',
            request: user.depositRequests[user.depositRequests.length - 1]
        });
    } catch (error) {
        console.error('Deposit error:', error);
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ 
                message: 'File upload error: ' + error.message 
            });
        }
        res.status(500).json({ 
            message: error.message || 'Server error' 
        });
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

export default router;