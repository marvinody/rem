import XRay from 'x-ray'

const x = XRay()
import { IExtractor, Item, ResultSet, SearchParams } from './IExtractor'


const BASE_URL = 'https://auctions.yahoo.co.jp/search/search'
const MAX_RESULTS_PER_PAGE = 100
export default class YAJ implements IExtractor {
    isEnabled() { return true; }
    search({
        page = 1,
        query,
    }: SearchParams): Promise<ResultSet> {
        const searchParams = new URLSearchParams({
            exflag: '1',
            n: MAX_RESULTS_PER_PAGE.toString(),
            b: ((page - 1) * MAX_RESULTS_PER_PAGE + 1).toString(),
            p: query,
            va: query,
        });
        const url = `${BASE_URL}?${searchParams.toString()}`
        console.debug("YAJ:" +url)
        return new Promise((resolve, rej) => {
            x(url, {
                hasNext: 'li.Pager__list--next > a@href',
                items: x('li.Product', [
                    {
                        title: '.Product__titleLink',
                        price: 'span.Product__priceValue',
                        image: 'img.Product__imageData@src'
                    }
                ])
            })

                .then(function (res: any) {
                    resolve({
                        items: res,
                        hasMore: false,
                    })
                })
                .catch(function (err: Error) {
                    console.log(err) // handle error in promise
                    rej(err)
                })
        })
    }
}

