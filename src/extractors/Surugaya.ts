import XRay from 'x-ray'
import { IExtractor, Item, ResultSet, SearchParams, Sites } from './IExtractor'

const x = XRay({
    filters: {
        parseNonDecimalInt: (value: string) => {
            // we're working in yen which probably not gonna have decimals
            // if this fails later, probably because of that
            const digits = value.match(/\d/g)
            if (digits) {
                return Number(digits.join(''))
            }
            return null;
        },
        boolify: val => Boolean(val),
        parseSuruSiteCode: (value: string) => {
            const s = value.split('?')
            const BASE_ITEM_STRING = 'https://www.suruga-ya.jp/product/detail/';
            return s[0].substring(BASE_ITEM_STRING.length)
        }
    }
})

export interface SurugayaItem extends Item {
    site: Sites.SURUGAYA
}

type XScraper = {
    hasMore: boolean,
    items: Array<{
        siteCode: string
        url: string
        title: string
        imageURL: string
        redPrice: number
    }>
}

const scraperToResultSet = (scraped: XScraper): ResultSet<SurugayaItem> => {

    const items = scraped.items.map(item => {

        const transformedItem: SurugayaItem = {
            site: Sites.SURUGAYA,
            title: item.title,
            url: item.url,
            price: item.redPrice,
            siteCode: item.siteCode,
            imageURL: item.imageURL
        }

        return transformedItem
    })

    return {
        hasMore: scraped.hasMore,
        items,
    }
}


const BASE_URL = 'https://www.suruga-ya.jp/search'

export default class Surugaya implements IExtractor<SurugayaItem, SearchParams> {
    isEnabled() { return true; }
    search({
        page = 1,
        query,
    }: SearchParams): Promise<ResultSet<SurugayaItem>> {
        const searchParams = new URLSearchParams({
            search_word: query,
            is_marketplace: '0',
            page: page.toString(),
        });
        const url = `${BASE_URL}?${searchParams.toString()}`
        return new Promise((resolve, rej) => {
            x(url, {
                hasMore: 'li.next | boolify',
                items: x('div.item', [
                    {
                        siteCode: '.title a@href | parseSuruSiteCode',
                        url: '.title a@href',
                        title: '.title',
                        imageURL: '.photo_box img@src',
                        redPrice: '.item_price .text-red | parseNonDecimalInt',
                        // just leaving this here for now in case this fix breaks it
                        // we're just using the red price because idk
                        // teikaPrice: '.price_teika | parseNonDecimalInt',
                        // lastLinePrice: '.mgnB5.mgnT5 | parseNonDecimalInt'
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

