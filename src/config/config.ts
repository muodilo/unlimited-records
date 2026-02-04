import dotenv from 'dotenv';
import path from 'path'

dotenv.config({path: path.join(__dirname,'../../.env')});

export const config = {
    port: process.env.PORT || 3000,
    mongodb: {
        uri: process.env.MONGODB_URI
    },
    jwt:{
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    },
    bcrypt:{
        saltRounds: parseInt(process.env.SALT_ROUNDS || '10',10)
    },
    email:{
        host:process.env.EMAIL_HOST,
        port:parseInt(process.env.EMAI_PORT || '587',10),
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASS,
    },
    frontend:{
        url:process.env.FRONTEND_URL,
    },
} as const;