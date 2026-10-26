/**
 * Pre-start is where we want to place things that must run BEFORE the express server is started.
 * This is useful for environment variables, command-line arguments, and cron-jobs.
 */

import path from 'path';
import dotenv from 'dotenv';
import commandLineArgs from 'command-line-args';

const ENVS = ['development', 'production', 'test'];



(() => {
    // Setup command line options
    const options = commandLineArgs([
        {
            name: 'env',
            alias: 'e',
            defaultValue: 'development',
            type: String,
        },
    ]);
    const env = String(options.env);
    if (!ENVS.includes(env)) {
        throw new Error(`Unknown --env "${env}", expected one of: ${ENVS.join(', ')}`);
    }
    // Set the env file
    const result2 = dotenv.config({
        path: path.join(__dirname, `env/${env}.env`),
    });
    if (result2.error) {
        throw result2.error;
    }
})();
