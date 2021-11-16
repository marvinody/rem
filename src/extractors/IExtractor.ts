
export enum Sites {
  YAJ = 'YAJ'
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

export interface IExtractor<CustomItem extends Item> {
  isEnabled(): boolean;
  search(params: SearchParams): Promise<ResultSet<CustomItem>>;
}
