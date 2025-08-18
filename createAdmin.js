import Admin from './models/admin.js';
import connectDB from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return process.exit(0);
    }

    // Create new admin
    const password = 'taylor3344'; // Strongly recommend replacing this before production

    const admin = new Admin({
      username: 'admin',
      password, // Pass plain password — will be hashed automatically by Mongoose middleware
      role: 'superadmin'
    });

    await admin.save();
    console.log('✅ Admin user created successfully');
    console.log(`Username: admin\nPassword: ${password}`); // Only show in development
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();

