
export enum Sites {
  YAJ = 'YAJ',
  MERCARI = 'MERCARI',
  LASHINBANG = 'LASHINBANG',
  RAKUTEN = 'RAKUTEN',
  MANDARAKE = 'MANDARAKE',
  SURUGAYA = 'SURUGAYA',
}

export interface Item {
  site: Sites;
  siteCode: string;
  url: string;
  price: number;
  imageURL: string;
  title: string;
}

export interface SearchParams {
  query: string;
  page?: number;
}

export interface ResultSet<CustomItem extends Item> {
  items: CustomItem[];
  hasMore: boolean;
}

export interface IExtractor<CustomItem extends Item, Params extends SearchParams> {
  isEnabled(): boolean;
  search(params: Params): Promise<ResultSet<CustomItem>>;
}
