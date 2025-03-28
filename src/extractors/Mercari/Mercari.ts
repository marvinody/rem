import axios, { Axios, AxiosResponse } from 'axios'
import { IExtractor, SearchParams, Item, ResultSet, Sites } from '../IExtractor'

import { makeDPOP, makeJWTKeys, keyPair } from './utils.js'

const ITEM_TYPES = {
  ITEM_TYPE_BEYOND: "ITEM_TYPE_BEYOND",
  ITEM_TYPE_MERCARI: "ITEM_TYPE_MERCARI",
}

const { MERCARI_SEARCH_DPOP } = process.env

type MercariItem = {
  sellerId: number,
  id: string,
  name: string,
  price: string,
  thumbnails: Array<string>,
  itemType: string
  created: number // timestamp
  updated: number // timestamp
  auction?: {
    totalBid: string
    highestBid?: string
  }
}

type MercariSearchResp = {
  result: "OK",
  meta: {
    nextPageToken: string,
    numFound: number,
  },
  items: Array<MercariItem>
}
type ITEM_SALE_TYPE = 'SALE' | 'AUCTION'

export interface MercariItemResult extends Item {
  site: Sites.MERCARI
  // Mercari specific fields
  type: ITEM_SALE_TYPE
  auction?: {
    totalBids: number
    highestBid?: number 
  }
}

const makeUrl = (item: MercariItem) => {
  if (item.itemType === ITEM_TYPES.ITEM_TYPE_MERCARI) {
    return `https://jp.mercari.com/item/${item.id}`
  }
  return `https://jp.mercari.com/shops/product/${item.id}`
}

const baseURL = 'https://api.mercari.jp/'
const searchPath = 'v2/entities:search'

const mercariToResultSet = (data: MercariSearchResp): ResultSet<Item> => ({
  hasMore: Boolean(data.meta.nextPageToken),
  items: data.items.map(item => ({
    imageURL: item.thumbnails.length > 0 ? item.thumbnails[0] : '',
    site: Sites.MERCARI,
    price: Number(item.price),
    siteCode: item.id,
    title: item.name,
    url: makeUrl(item),
    // Mercari specific fields
    // Note: Mercari doesn't have auction details in the same way as YAJ
    // For now, we will just return SALE as the type
    type: item?.auction ? 'AUCTION' : 'SALE' as ITEM_SALE_TYPE,
    auction: item?.auction ? {
      totalBids: item?.auction?.totalBid,
      highestBid: item.auction.highestBid
    } : undefined
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
      "pageToken": pageToPageToken(page - 1),

      "searchSessionId": "MERCARI_BOT",
      "indexRouting": "INDEX_ROUTING_UNSPECIFIED",
      "searchCondition": {
        "keyword": query,
        "sort": "SORT_CREATED_TIME",
        "order": "ORDER_DESC",
        "status": ["STATUS_ON_SALE"],
        // "excludeKeyword": exclude_keywords,
      },
      "withAuction": true,
      "defaultDatasets": [
        "DATASET_TYPE_MERCARI",
        "DATASET_TYPE_BEYOND"
      ]
    }, {
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
