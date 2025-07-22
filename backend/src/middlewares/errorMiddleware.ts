import { Request, Response, NextFunction } from 'express';

/**
 * Error handling middleware
 */
export const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`Error: ${err.message}`);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
};