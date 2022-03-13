import XRay from 'x-ray'
import makeXrayAxiosDriver from '../util/XrayAxiosDriver'

const x = XRay({
    filters: {
        trim: (value: string) => value.trim(),
        ultratrim: (value: string) => value.trim().replace(/\s/g, ''),
        parseIntoPrices: (value: string) => value.match(/(\d+(?:,\d+)*)円/g),
        getFirst: (value: RegExpMatchArray | null) => {
            return value?.[0]
        },
        parseNonDecimalInt: (value: string) => {
            // we're working in yen which probably not gonna have decimals
            // if this fails later, probably because of that
            const digits = value.match(/\d/g)
            if (digits) {
                return Number(digits.join(''))
            }
            return -1
        },
        boolify: val => Boolean(val)
    }
})
makeXrayAxiosDriver(x)


import { IExtractor, Item, ResultSet, SearchParams, Sites } from './IExtractor'

type XScraper = {
    hasMore: boolean,
    meta: Array<{
        category: string,
        amount: number,
    }>,
    items: Array<{
        siteCode: string
        url: string
        title: string
        price: number
        buyoutPrice: number
        imageURL: string
    }>
}

const scraperToResultSet = (scraped: XScraper): ResultSet<Item> => {
    const items = scraped.items.map(item => {
        return {
            site: Sites.MANDARAKE,
            title: item.title,
            url: item.url,
            price: item.price,
            siteCode: item.siteCode,
            imageURL: item.imageURL
        }
    })

    return {
        hasMore: scraped.hasMore,
        items,
    }
}


const BASE_URL = 'https://order.mandarake.co.jp/order/listPage/list'

export default class YAJ implements IExtractor<Item, SearchParams> {
    isEnabled() { return true; }
    search({
        page = 1,
        query,
    }: SearchParams): Promise<ResultSet<Item>> {
        const searchParams = new URLSearchParams({
            page: page.toString(),
            soldOut: '1',
            keyword: query,
        });
        const url = `${BASE_URL}?${searchParams.toString()}`
        return new Promise((resolve, rej) => {
            x(url, {
                hasMore: '.pager .next a | boolify',
                items: x('.thumlarge .block', [
                    {
                        siteCode: '.addcart a@data-index',
                        url: '.title a@href',
                        title: '.title | trim',
                        price: '.price \
                        | ultratrim | parseIntoPrices | getFirst | parseNonDecimalInt',
                        imageURL: '.pic img@src'
                    }
                ])
            })

                .then(function (resp: XScraper) {
                    resolve(scraperToResultSet(resp))
                })
                .catch(function (err: Error) {
                    console.log(err) // handle error in promise
                    rej(err)
                })
        })
    }
}

