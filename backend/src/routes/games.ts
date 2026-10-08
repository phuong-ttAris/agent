import { Router } from 'express';
import { addRound, createGame, deleteGame, deleteRound, duplicateGame, getGame, getSettlement, listGames, resetRounds, updateGame, updateRound } from '../controllers/gamesController.js';
import { ah } from '../utils/asyncHandler.js';

const r = Router();
r.get('/', ah(listGames));
r.post('/', ah(createGame));
r.get('/:id', ah(getGame));
r.delete('/:id', ah(deleteGame));
r.put('/:id', ah(updateGame));
r.post('/:id/duplicate', ah(duplicateGame));
r.delete('/:id/rounds', ah(resetRounds));
r.post('/:id/rounds', ah(addRound));
r.put('/:id/rounds/:roundId', ah(updateRound));
r.delete('/:id/rounds/:roundId', ah(deleteRound));
r.get('/:id/settlement', ah(getSettlement));
export default r;
