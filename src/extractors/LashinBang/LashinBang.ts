import axios, { Axios } from 'axios'

import { IExtractor, Item, ResultSet, SearchParams, Sites } from '../IExtractor'

export interface LashinBangItem extends Item {
    site: Sites.LASHINBANG
    maker: string,
    nsfw: boolean
}

const lashinBangToResultSet = (data: LashingBangSearchResp): ResultSet<LashinBangItem> => ({
    hasMore: data.kotohaco.result.info.current_page !== data.kotohaco.result.info.last_page,
    items: data.kotohaco.result.items.map(item => ({
        site: Sites.LASHINBANG,
        imageURL: item.image,
        price: item.price,
        siteCode: item.itemid,
        title: item.title,
        url: item.url,
        maker: item.narrow2,
        nsfw: item.narrow1 !== '2'
    }))
})


type LashingBangSearchResp = {
    kotohaco: {
        result: {
            info: {
                current_page: number
                last_page: number
            }
            items: Array<{
                itemid: string
                title: string
                url: string
                image: string
                price: number
                narrow1: string
                narrow2: string
            }>
        }
    }
}


const BASE_URL = 'https://lashinbang-f-s.snva.jp'

export default class LashinBang implements IExtractor<LashinBangItem, SearchParams> {

    request: Axios

    constructor() {

        this.request = axios.create({
            baseURL: BASE_URL
        })
    }



    private async searchAPI(
        { page = 1, query }:
            SearchParams):
        Promise<LashingBangSearchResp> {
        const callback = 'callback'
        return this.request.get<string>('/', {
            params: {
                q: query,
                searchbox: query.split(' '),
                s60: 1,
                pl: 1,
                sort: 'Number18,Score',
                limit: 20,
                o: page - 1,
                n6l: 1,
                controller: 'lashinbang_front',
                callback,
            },
        }).then(({ data }) => {

            const strippedJsonp = data.replace(/^callback\(|\);?$/g, '')
            const parsed: LashingBangSearchResp = JSON.parse(strippedJsonp)
            return parsed;
        })
    }


    isEnabled() { return true; }
    async search({
        page = 1,
        query,
    }: SearchParams): Promise<ResultSet<LashinBangItem>> {
        const data = await this.searchAPI({ page, query, });

        return lashinBangToResultSet(data);

    }
}

