import axios, { Axios, AxiosResponse } from 'axios'
import { IExtractor, SearchParams, Item, ResultSet, Sites } from '../IExtractor'

import { makeDPOP, makeJWTKeys, keyPair } from './utils.js'


const { MERCARI_SEARCH_DPOP } = process.env

type MercariSearchResp = {
    result: "OK",
    meta: {
      nextPageToken: string,
      numFound: number,
    },
    items: Array<{
      sellerId: number,
      id: string,
      name: string,
      price: number,
      thumbnails: Array<string>
      created: number // timestamp
      updated: number // timestamp
    }>
}


const baseURL = 'https://api.mercari.jp/'
const searchPath = 'v2/entities:search'

const mercariToResultSet = (data: MercariSearchResp): ResultSet<Item> => ({
  hasMore: Boolean(data.meta.nextPageToken),
  items: data.items.map(item => ({
    imageURL: item.thumbnails.length > 0 ? item.thumbnails[0] : '',
    site: Sites.MERCARI,
    price: item.price,
    siteCode: item.id,
    title: item.name,
    url: `https://jp.mercari.com/item/${item.id}`
  }))
})

const pageToPageToken = (page: number) => `v1:${page.toString()}`

export default class Mercari implements IExtractor<Item, SearchParams> {

  keys?: keyPair
  request: Axios

  constructor() {

    this.request = axios.create({
      baseURL,
    })
  }

  isEnabled() {
    return Boolean(MERCARI_SEARCH_DPOP)
  }

  private async searchAPI(
    { page = 1, query, dpop }:
      SearchParams & { dpop: string }):
    Promise<AxiosResponse<MercariSearchResp>> {
    return this.request.post(searchPath, {
      "userId": "MERCARI_BOT", 
      "pageSize": 120,
      "pageToken": pageToPageToken(page),

      "searchSessionId": "MERCARI_BOT",
      "indexRouting": "INDEX_ROUTING_UNSPECIFIED",
      "searchCondition": {
          "keyword": query,
          "sort": "SORT_CREATED_TIME",
          "order": "ORDER_DESC",
          "status": ["STATUS_ON_SALE"],
          // "excludeKeyword": exclude_keywords,
      },
      "defaultDatasets": [
          "DATASET_TYPE_MERCARI",
          "DATASET_TYPE_BEYOND"
      ]
    },{
      headers: {
        'X-Platform': 'web',
        DPoP: dpop,
      },
    })
  }

  async search({ page, query }: SearchParams): Promise<ResultSet<Item>> {

    const payload = {
      "iat": Math.floor(Date.now() / 1000),
      "jti": "fake_madeup_jti",
      "htu": `${baseURL}${searchPath}`,
      "htm": "POST"
    }

    if (!this.keys) {
      const keys = await makeJWTKeys();
      this.keys = keys;
    }

    const dpop = await makeDPOP(this.keys, payload);

    const { data } = await this.searchAPI({ page, query, dpop });

    return mercariToResultSet(data);
  }
}
