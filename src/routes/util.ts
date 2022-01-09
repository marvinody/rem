import { IncomingHttpHeaders } from 'http'
import { Request, Response, NextFunction } from 'express';

interface ApiKeyRequest extends Request {
  myAwesomeProperty?: number
  headers: IncomingHttpHeaders & {
    "api-key"?: string
  }
}


const authHandler = (req: ApiKeyRequest, res: Response, next: NextFunction) => {
  if (process.env.SECRET_KEY) {
    if (req.headers?.['api-key'] === process.env.SECRET_KEY) {
      next()
    } else {
      res.sendStatus(403)
    }
  } else {
    next()
  }
}

const notFoundHandler = (req: Request, res: Response,) => {

  return res.sendStatus(404)

}

export { authHandler, notFoundHandler }
