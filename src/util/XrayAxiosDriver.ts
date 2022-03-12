import axios from 'axios'
import { Instance } from 'x-ray'
import { Driver, Callback } from 'x-ray-crawler'
import HttpContext from 'http-context'
import https from 'https'

type options = {
  headers: Record<string, string>;
}

const makeDriver = (): Driver => {

  const ax = axios.create({
    httpsAgent: new https.Agent({
      family: 4,
    }),
  })

  return (ctx: HttpContext.Context, cb: Callback<HttpContext.Context>) => {
    ax.get(ctx.url).then(({ data }) => {
      ctx.body = data
      // this is a screwup by the type defs from definitelytyped. 
      // It expects an error to always be passed in...even in all scenarios
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      cb(null, ctx)
    }).catch(err => cb(err, ctx))
  };
};



export default function makeXrayAxiosDriver(xray: Instance, options?: options) {
  const driver = makeDriver();

  xray.driver(driver)
}

