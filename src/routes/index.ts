// god, this is why I hate TS. shit typings make this painful to do
/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express';
import { getAllUsers, addOneUser, updateOneUser, deleteOneUser } from './Users';


// User-route
const userRouter = Router();
userRouter.get('/all', getAllUsers);
userRouter.post('/add', addOneUser);
userRouter.put('/update', updateOneUser);
userRouter.delete('/delete/:id', deleteOneUser);

import { YAJsearch } from './YAJSearch'
import { MercariSearch } from './MercariSearch'

// Export the base-router
const baseRouter = Router();
baseRouter.use('/users', userRouter);
baseRouter.get('/search/yaj', YAJsearch)
baseRouter.get('/search/mercari', MercariSearch)
export default baseRouter;
