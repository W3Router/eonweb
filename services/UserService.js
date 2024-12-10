const User = require('../models/User');
const bcrypt = require('bcryptjs');

class UserService {
    static async createUser(email, password, isAdmin = false) {
        console.log('Creating user:', email, 'isAdmin:', isAdmin);
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            email,
            password: hashedPassword,
            isAdmin
        });
        await user.save();
        console.log('User created:', user);
        return user.id;
    }

    static async verifyUser(email, password) {
        console.log('Verifying user with email:', email);
        const user = await User.findOne({ email });
        console.log('Found user in verifyUser:', user);

        if (!user) {
            console.log('No user found with this email');
            return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        console.log('Password comparison result:', isValid);

        return isValid ? user : null;
    }

    static async findById(id) {
        return User.findById(id);
    }

    static async findUserByEmail(email) {
        console.log('Finding user by email:', email);
        const user = await User.findOne({ email });
        console.log('Found user:', user);
        return user;
    }

    static async generateReferralCode(userId) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        // 生成随机推荐码
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // 设置一个月有效期
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + 1);

        user.referralCode = code;
        user.referralCodeExpiry = expiry;
        await user.save();

        return {
            code,
            expiry,
            referralLink: `https://w3router.github.io/eonweb/public/auth/register.html?ref=${code}`
        };
    }

    static async getReferralStats(userId) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        return {
            referralCode: user.referralCode,
            referralCodeExpiry: user.referralCodeExpiry,
            referralCount: user.referralCount,
            referralLink: user.referralCode ? 
                `https://w3router.github.io/eonweb/public/auth/register.html?ref=${user.referralCode}` : 
                null
        };
    }
}

module.exports = UserService;
