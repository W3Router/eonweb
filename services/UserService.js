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
}

module.exports = UserService;
