import express from 'express';
import User from '../models/user.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15d' });
};

// Brevo SMTP transporter configuration (Fixed)
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587, // or 465 for SSL
  secure: false, // true for port 465, false for 587
  auth: {
    user: '74aa5d003@smtp-brevo.com', // your Brevo login email
    pass: '1A7kRIDLS568F0w9'     // the SMTP key
  }
});

// Rate limiting middleware for password reset requests
const resetRateLimiter = (req, res, next) => {
  // Implement your rate limiting logic here
  // Example: 5 requests per hour per IP
  next();
};

// Forgot Password Route
router.post('/forgot-password', resetRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 3600000;

    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const mailOptions = {
      to: user.email,
      from: '"Fourx" <fourx@example.com>',
      subject: 'Password Reset Request',
      text: `You requested a password reset. Please use this link: ${resetUrl}\n\nThis link expires in 1 hour.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Password Reset Request</h2>
          <p>You requested to reset your password. Click the button below to proceed:</p>
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0;">
            Reset Password
          </a>
          <p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 12px; color: #6b7280;">For security reasons, we don't store your password. This link can only be used once.</p>
        </div>
      `,
      headers: {
        'X-Mailer': 'YourApp/1.0',
        'X-Priority': '1'
      }
    };

    try {
      await transporter.sendMail(mailOptions);
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent'
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);

      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again later.'
      });
    }

  } catch (error) {
    console.error("Error in forgot password route:", error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Reset Password Route
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired'
      });
    }

    if (await user.comparePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.passwordChangedAt = Date.now();

    await user.save();

    const mailOptions = {
      to: user.email,
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
      subject: 'Password Changed Successfully',
      text: `Your password has been successfully updated. If you didn't make this change, please contact support immediately.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Password Updated</h2>
          <p>Your password has been successfully changed.</p>
          <p>If you didn't make this change, please contact our support team immediately.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 12px; color: #6b7280;">Security tip: Never share your password with anyone.</p>
        </div>
      `
    };

    transporter.sendMail(mailOptions).catch(console.error);

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error("Error in reset password route:", error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

export default router;
