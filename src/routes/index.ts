// god, this is why I hate TS. shit typings make this painful to do
/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router, Request } from 'express';

import { authHandler, notFoundHandler } from './util'
import { getAllUsers, addOneUser, updateOneUser, deleteOneUser } from './Users';
import cors, { } from 'cors'
import expeditious from 'express-expeditious'



// User-route
const userRouter = Router();
userRouter.get('/all', getAllUsers);
userRouter.post('/add', addOneUser);
userRouter.put('/update', updateOneUser);
userRouter.delete('/delete/:id', deleteOneUser);

import { YAJsearch } from './YAJSearch'
import { MercariSearch } from './MercariSearch'
import { LashingBangsearch } from './LashingBang'
import { RakutenSearch } from './RakutenSearch';
import { MandarakeSearch } from './MandarakeSearch';
import { SurugayaSearch } from './SurugayaSearch';

// Export the base-router
const baseRouter = Router();

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',')
if (!ALLOWED_ORIGINS) {
  throw new Error("Allowed Origins not set")
} else {
  console.log(`Allowed Origins: ${ALLOWED_ORIGINS.map(s => `'${s}'`).join(',')}`)
}

// actually just fk all of typescript sometimes
// shit types break code more than no types and it's absurb and shows how much I hate this language
// when devs let other people do types for them.
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
const corsMiddleware = cors<Request>((req, callback) => {
  const corsOptions = { origin: '' };
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const origin = req.headers.origin!


  if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
    corsOptions.origin = origin
  } else {
    // disable CORS for this request by default
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  callback(null, corsOptions) // callback expects two parameters: error and options
});

const cache = expeditious({
  namespace: 'remSearch',
  defaultTtl: '2 minute',
})

baseRouter.use(corsMiddleware);
baseRouter.get('/search/yaj', authHandler, cache, YAJsearch)
baseRouter.get('/search/mercari', authHandler, cache, MercariSearch)
baseRouter.get('/search/lashinbang', authHandler, cache, LashingBangsearch)
baseRouter.get('/search/rakuten', authHandler, cache, RakutenSearch)
baseRouter.get('/search/mandarake', authHandler, cache, MandarakeSearch)
baseRouter.get('/search/surugaya',authHandler, cache, SurugayaSearch)


baseRouter.use(notFoundHandler)
export default baseRouter;
