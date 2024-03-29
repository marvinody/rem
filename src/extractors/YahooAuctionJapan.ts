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

type Prices = Array<{
    label: string,
    value: number,
}>

type VALID_SALES = 'BUYOUT' | 'AUCTION' | 'AUCTION_WITH_BUYOUT'
type INVALID_SALES = 'UNKNOWN'
type SALES = VALID_SALES | INVALID_SALES

export interface YAJItem extends Item {
    site: Sites.YAJ
    type: SALES
    buyoutPrice?: number; // only appears on buyout items
}

type XScraper = {
    hasMore: boolean,
    notice: boolean,
    meta: Array<{
        category: string,
        amount: number,
    }>,
    items: Array<{
        siteCode: string
        url: string
        title: string
        imageURL: string
        prices: Prices,
    }>
}

const pricingExtractor = (prices: Prices): {
    type: SALES,
    price: number,
    buyoutPrice?: number
} => {
    const PROMPT_DECISION = '即決'; // buyout at this price
    const CURRENT = '現在'; // current price

    const auction = prices.find(p => p.label === CURRENT);
    const buyout = prices.find(p => p.label === PROMPT_DECISION);

    if (auction && buyout) {
        return {
            type: 'AUCTION_WITH_BUYOUT',
            price: auction.value,
            buyoutPrice: buyout.value
        }
    }
    if (buyout) {
        return {
            type: 'BUYOUT',
            price: buyout.value,
            buyoutPrice: buyout.value, // for backwards compat
        }
    }
    if (auction) {
        return {
            type: 'AUCTION',
            price: auction.value
        }
    }

    return {
        type: 'UNKNOWN',
        price: prices[0]?.value
    }
}

const scraperToResultSet = (scraped: XScraper): ResultSet<YAJItem> => {

    if (scraped.notice) {
        return {
            hasMore: false,
            items: [],
        }
    }

    const items = scraped.items.map(item => {
        const pricing = pricingExtractor(item.prices)

        const transformedItem: YAJItem = {
            site: Sites.YAJ,
            type: pricing.type,
            title: item.title,
            url: item.url,
            price: pricing.price,
            siteCode: item.siteCode,
            imageURL: item.imageURL
        }
        if (pricing.type === 'AUCTION_WITH_BUYOUT' || pricing.type === 'BUYOUT') {
            transformedItem.buyoutPrice = pricing.buyoutPrice
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
export default class YAJ implements IExtractor<YAJItem, SearchParams> {
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
        return new Promise((resolve, rej) => {
            x(url, {
                hasMore: 'li.Pager__list--next > a@href | boolify',
                notice: '.Notice | boolify',
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
                        imageURL: 'img.Product__imageData@src',
                        prices: x('div.Product__price', 'span.Product__price', [
                            {
                                label: '.Product__label',
                                value: '.Product__priceValue \
                                | parseNonDecimalInt',
                            }
                        ])
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

