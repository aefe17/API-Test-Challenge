import { Router } from 'express';
import {
    getUser,
    getUsers,
    patchUser,
    postUser,
    putUser,
    removeUser,
} from '../controllers/userController';

const router = Router();

router.get('/', getUsers);
router.post('/', postUser);
router.get('/:id', getUser);
router.put('/:id', putUser);
router.patch('/:id', patchUser);
router.delete('/:id', removeUser);

export default router;
