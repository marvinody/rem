import {search as YAJSearch} from '../extractors/YahooAuctionJapan'
import { Request, Response } from 'express';

export async function search(req: Request, res: Response) {
    const results = await YAJSearch()
    return res.json(results)
}
