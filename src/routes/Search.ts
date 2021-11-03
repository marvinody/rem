import YAJ from '../extractors/YahooAuctionJapan'
import { Request, Response } from 'express';

const service = new YAJ();
export async function search(req: Request, res: Response) {
    const results = await service.search({query: '東方 ふもふも', page: 4})
    res.json(results)
}
