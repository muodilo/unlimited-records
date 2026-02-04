import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan'

const app = express()

//middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({extended:true}))


//Error handling middleware
app.use((err:Error,req:express.Request, res:express.Response, next:express.NextFunction)=>{
    console.error(err.stack);
    res.status(500).json({
        status:'error',
        message: 'Internal server error'
    });
});

export default app;