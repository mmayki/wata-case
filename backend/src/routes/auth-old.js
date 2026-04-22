const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

async function register(username, password, fullName, role, className = null) {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const { data, error } = await supabase
        .from('users')
        .insert([{
            username,
            password_hash: hashedPassword,
            full_name: fullName,
            role,
            class_name: className
        }])
        .select('id, username, full_name, role, class_name')
        .single();
    
    if (error) throw new Error(error.message);
    return data;
}

async function login(username, password) {
    console.log('🔍 Ищем пользователя:', username);
    
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
    
    if (error) {
        console.log('❌ Ошибка поиска:', error.message);
        return null;
    }
    
    if (!user) {
        console.log('❌ Пользователь не найден');
        return null;
    }
    
    console.log('✅ Пользователь найден:', user.username);
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
        console.log('❌ Неверный пароль');
        return null;
    }
    
    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
    
    return {
        token,
        user: {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role,
            class_name: user.class_name
        }
    };
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

module.exports = { register, login, verifyToken };