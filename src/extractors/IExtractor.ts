
export interface Item {
  site: string;
  siteCode: string;
  url: string;
  price: number;
  imageURL: string;
}

export interface SearchParams {
  query: string;
  page?: number;
}

export interface ResultSet {
  items: Item[];
  hasMore: boolean;
}

export interface IExtractor {
  isEnabled(): boolean;
  search(params: SearchParams): Promise<ResultSet>;
}
