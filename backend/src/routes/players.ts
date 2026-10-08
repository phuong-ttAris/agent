import { Router } from 'express';
import { createPlayer, deletePlayer, listPlayers, totalsAll, updatePlayer } from '../controllers/playersController.js';
import { ah } from '../utils/asyncHandler.js';

const r = Router();
r.get('/', ah(listPlayers));
r.get('/totals', ah(totalsAll));
r.post('/', ah(createPlayer));
r.put('/:id', ah(updatePlayer));
r.delete('/:id', ah(deletePlayer));
export default r;
