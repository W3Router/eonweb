const bcrypt = require('bcryptjs');

async function generateHash() {
    const password = 'vijTo9-kehmet-cessis';
    const hash = await bcrypt.hash(password, 10);
    console.log('Password:', password);
    console.log('Hash:', hash);
}

generateHash();