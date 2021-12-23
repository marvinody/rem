import axios, { Axios, AxiosResponse } from 'axios'
import { IExtractor, SearchParams, Item, ResultSet, Sites } from '../IExtractor'

import { makeDPOP, makeJWTKeys, keyPair } from './utils.js'


const { MERCARI_SEARCH_DPOP } = process.env

type MercariSearchResp = {
    result: "OK",
    meta: {
      has_next: boolean,
      num_found: number,
    },
    data: Array<{
      seller: {
        id: number,
      }
      id: string,
      name: string,
      price: number,
      thumbnails: Array<string>
      created: number // timestamp
      updated: number // timestamp
    }>
}



const mercariToResultSet = (data: MercariSearchResp): ResultSet<Item> => ({
  hasMore: data.meta.has_next,
  items: data.data.map(item => ({
    imageURL: item.thumbnails.length > 0 ? item.thumbnails[0] : '',
    site: Sites.MERCARI,
    price: item.price,
    siteCode: item.id,
    title: item.name,
    url: `https://jp.mercari.com/item/${item.id}`
  }))
})

export default class Mercari implements IExtractor<Item, SearchParams> {

  keys?: keyPair
  request: Axios

  constructor() {

    this.request = axios.create({
      baseURL: 'https://api.mercari.jp/'
    })
  }

  isEnabled() {
    return Boolean(MERCARI_SEARCH_DPOP)
  }

  private async searchAPI(
    { page = 1, query, dpop }:
      SearchParams & { dpop: string }):
    Promise<AxiosResponse<MercariSearchResp>> {
    return this.request.get('search_index/search', {
      headers: {
        'X-Platform': 'web',
        DPoP: dpop,
      },
      params: {
        page: page - 1,
        keyword: query,
        limit: 120,
        sort: 'created_time',
        order: 'desc',
        status: 'on_sale'
      },
    })
  }

  async search({ page, query }: SearchParams): Promise<ResultSet<Item>> {

    const payload = {
      "iat": Math.floor(Date.now() / 1000),
      "jti": "fake_madeup_jti",
      "htu": "https://api.mercari.jp/search_index/search",
      "htm": "GET"
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
