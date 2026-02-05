import type {Request, Response, NextFunction} from 'express'
import type {ZodSchema} from 'zod'

/**
 * Middleware to validate the request body against a given Zod schema.
 *
 * @param schema - The Zod schema to validate the request body against.
 * @returns An Express middleware function that validates the request body.
 *
 * @throws Will respond with a 400 status code and a JSON error message if validation fails.
 */

export const validateRequest = (schema:ZodSchema)=>{
    return async (req:Request, res:Response, next:NextFunction):Promise<void>=>{
        try {
            await schema.parseAsync(req.body);
            next()
        } catch (error) {
            if(error instanceof Error){
                res.status(400).json({
                    status:'error',
                    message:'Validation failed',
                    errors: 'errors' in error ? (error as any).errors : [error.message],
                });
                return;
            }
            next(error);
        }
    }
}