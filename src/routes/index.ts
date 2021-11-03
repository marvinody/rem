import { Router } from 'express';
import { getAllUsers, addOneUser, updateOneUser, deleteOneUser } from './Users';


// User-route
const userRouter = Router();
userRouter.get('/all', getAllUsers);
userRouter.post('/add', addOneUser);
userRouter.put('/update', updateOneUser);
userRouter.delete('/delete/:id', deleteOneUser);

import { search } from './Search'

// Export the base-router
const baseRouter = Router();
baseRouter.use('/users', userRouter);
baseRouter.get('/test', search)
export default baseRouter;
