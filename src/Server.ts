import morgan from 'morgan';
import helmet from 'helmet';

import express, { NextFunction, Request, Response } from 'express';
import StatusCodes from 'http-status-codes';
import 'express-async-errors';

import BaseRouter from './routes';
import logger from '@shared/Logger';
import { describeError, LOG_BODY_LIMIT } from '@shared/errorDetails';

const app = express();
const { BAD_REQUEST } = StatusCodes;



/************************************************************************************
 *                              Set basic express settings
 ***********************************************************************************/

// Show routes called in console during development
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('tiny'))
}

// Security
if (process.env.NODE_ENV === 'production') {
    app.use(helmet());
}

// Add APIs
app.use('/api', BaseRouter);

// Print API errors
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    const details = describeError(err);
    // Inspecting a whole axios error dumps its config, which can hold proxy credentials,
    // so upstream errors log just the stack plus the redacted details.
    logger.err(details ? (err.stack ?? err.message) : err, !details);
    if (details) {
        logger.err(JSON.stringify({
            route: req.originalUrl,
            ...describeError(err, LOG_BODY_LIMIT),
        }));
    }
    return res.status(BAD_REQUEST).json({
        error: err.message,
        ...(details ? { details } : {}),
    });
});


// Export express instance
export default app;
