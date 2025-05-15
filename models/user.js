import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,

    },
    password: {
        type: String,
        required: true,
        minlength: 6

    },
    balance: {
        type: Number,
        default: 0,
        min: 0
    },
    earn: {
        type: Number,
        default: 0,
        min: 0
    },
    referredEarn: {
        type: Number,
        default: 0,
        min: 0
    },
    referralCode: {
        type: String,
        unique: true
    },
    referredBy: {
        type: String,
        default: null
    },
    resetPasswordToken: {  // New field for password reset
        type: String,
        default: undefined // Will not be saved if undefined
    },
    resetPasswordExpires: {  // New field for token expiration
        type: Date,
        default: undefined // Will not be saved if undefined
    },

    depositRequests: [{
        amount: Number,
        method: String,
        transactionId: String,
        proofImage: String,
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        createdAt: { type: Date, default: Date.now }
    }],
    withdrawalRequests: [{
        amount: Number,
        method: String,
        accountDetails: String,
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        createdAt: { type: Date, default: Date.now }
    }],
    referredUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    hasAwardedReferralBonus: {
        type: Boolean,
        default: false
    },
    totalDeposits: { type: Number, default: 0 },
    totalWithdrawals: { type: Number, default: 0 }


}, { timestamps: true });


// Middleware to update the 'updatedAt' field before saving
userSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Generate Referral Code

const generateReferralCode = async () => {
    const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const length = 8;
    let referralCode = '';
    let isUnique = false;

    while (!isUnique) {
        // Generate a random code
        for (let i = 0; i < length; i++) {
            referralCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        // Check if the code already exists in the database
        const existingUser = await mongoose.model('User').findOne({ referralCode });
        if (!existingUser) {
            isUnique = true;
        } else {
            referralCode = ''; // Reset and try again
        }
    }

    return referralCode;
};

// Middleware to generate and assign a unique referral code before saving
userSchema.pre('save', async function (next) {
    if (!this.referralCode) {
        this.referralCode = await generateReferralCode();
    }
    next();
});


userSchema.pre('save', async function (next) {

    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare passowrd
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};


const User = mongoose.model('User', userSchema);

export default User;
