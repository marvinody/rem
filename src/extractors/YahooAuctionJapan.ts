import XRay from 'x-ray'

const x = XRay({
    filters: {
        categoryTranslator: (value) => {
            switch (value) {
                case 'すべて':
                    return 'ALL';
                case 'オークション':
                    return 'AUCTION'
                case '定額':
                    return 'BUY_IT_NOW'
                default:
                    return 'UNKNOWN_CATEGORY'
            }
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
import { IExtractor, Item, ResultSet, SearchParams, Sites } from './IExtractor'

export interface YAJItem extends Item {
    site: Sites.YAJ
    type: 'BUYOUT' | 'AUCTION'
    buyoutPrice?: number; // only appears on buyout items
}

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

const scraperToResultSet = (scraped: XScraper): ResultSet<YAJItem> => {
    const items = scraped.items.map(item => {
        const transformedItem: YAJItem = {
            site: Sites.YAJ,
            type: 'AUCTION',
            title: item.title,
            url: item.url,
            price: item.price,
            siteCode: item.siteCode,
            imageURL: item.imageURL
        }
        if (item.buyoutPrice > 0) {
            transformedItem.buyoutPrice = item.buyoutPrice
            transformedItem.type = 'BUYOUT'
        }
        return transformedItem
    })

    return {
        hasMore: scraped.hasMore,
        items,
    }
}


const BASE_URL = 'https://auctions.yahoo.co.jp/search/search'
const MAX_RESULTS_PER_PAGE = 100
export default class YAJ implements IExtractor<YAJItem> {
    isEnabled() { return true; }
    search({
        page = 1,
        query,
    }: SearchParams): Promise<ResultSet<YAJItem>> {
        const searchParams = new URLSearchParams({
            exflag: '1',
            n: MAX_RESULTS_PER_PAGE.toString(),
            b: ((page - 1) * MAX_RESULTS_PER_PAGE + 1).toString(),
            p: query,
            va: query,
        });
        const url = `${BASE_URL}?${searchParams.toString()}`
        console.debug("YAJ:" + url)
        return new Promise((resolve, rej) => {
            x(url, {
                hasMore: 'li.Pager__list--next > a@href | boolify',
                meta: x('li.Tab__item', [
                    {
                        category: '.Tab__text \
                        | categoryTranslator',
                        amount: '.Tab__subText \
                        | parseNonDecimalInt'
                    }
                ]),
                items: x('li.Product', [
                    {
                        siteCode: '.Product__imageLink@data-auction-id',
                        url: 'a.Product__imageLink@href',
                        title: '.Product__titleLink',
                        price: 'span.Product__priceValue \
                        | parseNonDecimalInt',
                        buyoutPrice: 'span.Product__price:nth-child(2) .Product__priceValue \
                        | parseNonDecimalInt',
                        imageURL: 'img.Product__imageData@src'
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

