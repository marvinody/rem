import axios, { Axios, AxiosResponse } from 'axios'
import { IExtractor, SearchParams, Item, ResultSet, Sites } from './IExtractor'

const { RAKUTEN_APPLICATION_ID } = process.env

type RakutenItem = {
  itemCode: string,
  itemName: string,
  itemPrice: number,
  imageFlag: number,
  itemUrl: string,
  mediumImageUrls: Array<{
    imageUrl: string
  }>
}

type RakutenSearchResp = {
  count: number,
  page: number,
  pageCount: number,
  Items: Array<{
    Item: RakutenItem
  }>
}

const rakutenToResultSet = (data: RakutenSearchResp): ResultSet<Item> => ({
  hasMore: data.page < data.pageCount,
  items: data.Items.map(({ Item: item }) => ({
    imageURL: item.imageFlag && item.mediumImageUrls.length > 0
      ? item.mediumImageUrls[0].imageUrl
      : '',
    site: Sites.RAKUTEN,
    price: item.itemPrice,
    siteCode: item.itemCode,
    title: item.itemName,
    url: item.itemUrl,
  }))
})

export default class Rakuten implements IExtractor<Item, SearchParams> {

  request: Axios

  constructor() {

    this.request = axios.create({
      baseURL: 'https://app.rakuten.co.jp/services/api/'
    })
  }

  isEnabled() {
    return Boolean(RAKUTEN_APPLICATION_ID)
  }

  private async searchAPI(
    { page = 1, query }:
      SearchParams):
    Promise<AxiosResponse<RakutenSearchResp>> {


    
    return this.request.get('IchibaItem/Search/20170706', {
      params: {
        page: page,
        keyword: query,
        applicationId: RAKUTEN_APPLICATION_ID
      },
    })
  }

  async search({ page, query }: SearchParams): Promise<ResultSet<Item>> {

    const { data } = await this.searchAPI({ page, query });

    return rakutenToResultSet(data);
  }
}
