import Mandarake from '../extractors/Mandarake'
import { Request, Response } from 'express';

const service = new Mandarake();
export async function MandarakeSearch(req: Request, res: Response) {
    const { query, page = 1 } = req.query

    if(!query || typeof query !== 'string' || query.length < 3) {
        throw new Error("Query is required and needs at least 3 characters")
    }

    if(typeof page !== 'string' || isNaN(Number(page)) || Number(page) <= 0) {

        throw new Error("Page must be a number if given & needs to be non-zero & positive")
    }

    const results = await service.search({ query, page:Number(page), })
    res.json(results)
}
