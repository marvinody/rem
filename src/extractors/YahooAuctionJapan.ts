import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { IExtractor, Item, ResultSet, SearchParams, Sites } from "./IExtractor";
import logger from "../shared/Logger";
import { DetailedError, describeError, truncate } from "../shared/errorDetails";

type Prices = Array<{
  label: string;
  value: number;
}>;

type VALID_SALES = "BUYOUT" | "AUCTION" | "AUCTION_WITH_BUYOUT";
type INVALID_SALES = "UNKNOWN";
type SALES = VALID_SALES | INVALID_SALES;

export interface YAJItem extends Item {
  site: Sites.YAJ;
  type: SALES;
  buyoutPrice?: number; // only appears on buyout items
}

type XScraper = {
  hasMore: boolean;
  items: Array<{
    siteCode: string;
    url: string;
    title: string;
    imageURL: string;
    prices: Prices;
  }>;
};

type JsonObject = Record<string, unknown>;

type NextListingItem = {
  auctionId?: string;
  title?: string;
  imageUrl?: string;
  price?: number | string;
  buyNowPrice?: number | string;
  isFixedPrice?: boolean;
};

type NextListing = {
  items?: NextListingItem[];
  totalResultsAvailable?: number | string;
  metadata?: {
    limit?: number | string;
  };
};

const parseNonDecimalInt = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const digits = value.match(/\d/g);
    if (digits) {
      return Number(digits.join(""));
    }
  }
  return -1;
};

const pricingExtractor = (
  prices: Prices,
): {
  type: SALES;
  price: number;
  buyoutPrice?: number;
} => {
  const PROMPT_DECISION = "即決"; // buyout at this price
  const CURRENT = "現在"; // current price

  const auction = prices.find((p) => p.label === CURRENT);
  const buyout = prices.find((p) => p.label === PROMPT_DECISION);

  if (auction && buyout) {
    return {
      type: "AUCTION_WITH_BUYOUT",
      price: auction.value,
      buyoutPrice: buyout.value,
    };
  }
  if (buyout) {
    return {
      type: "BUYOUT",
      price: buyout.value,
      buyoutPrice: buyout.value, // for backwards compat
    };
  }
  if (auction) {
    return {
      type: "AUCTION",
      price: auction.value,
    };
  }

  return {
    type: "UNKNOWN",
    price: prices[0]?.value,
  };
};

const scraperToResultSet = (scraped: XScraper): ResultSet<YAJItem> => {
  const items = scraped.items.map((item) => {
    const pricing = pricingExtractor(item.prices);

    const transformedItem: YAJItem = {
      site: Sites.YAJ,
      type: pricing.type,
      title: item.title,
      url: item.url,
      price: pricing.price,
      siteCode: item.siteCode,
      imageURL: item.imageURL,
    };
    if (pricing.type === "AUCTION_WITH_BUYOUT" || pricing.type === "BUYOUT") {
      transformedItem.buyoutPrice = pricing.buyoutPrice;
    }

    return transformedItem;
  });

  return {
    hasMore: scraped.hasMore,
    items,
  };
};

const isObject = (value: unknown): value is JsonObject =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const HTML_SNIPPET_LIMIT = 1500;

const describeHtml = (html: string) => ({
  htmlLength: html.length,
  pageTitle: /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim(),
  htmlSnippet: truncate(html, HTML_SNIPPET_LIMIT),
});

const extractNextData = (html: string): unknown => {
  const pattern =
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i;
  const match = pattern.exec(html);
  if (!match || !match[1]) {
    throw new DetailedError(
      "Unable to find __NEXT_DATA__ payload in YAJ HTML",
      describeHtml(html),
    );
  }
  try {
    return JSON.parse(match[1]);
  } catch (err) {
    throw new DetailedError("Unable to parse __NEXT_DATA__ payload in YAJ HTML", {
      parseError: (err as Error).message,
      ...describeHtml(match[1]),
    });
  }
};

const getListingFromNextData = (nextData: unknown): NextListing | undefined => {
  if (!isObject(nextData)) {
    return undefined;
  }
  const props = nextData.props;
  if (!isObject(props)) {
    return undefined;
  }
  const pageProps = props.pageProps;
  if (!isObject(pageProps)) {
    return undefined;
  }
  const initialState = pageProps.initialState;
  if (!isObject(initialState)) {
    return undefined;
  }
  const search = initialState.search;
  if (!isObject(search)) {
    return undefined;
  }
  const items = search.items;
  if (!isObject(items)) {
    return undefined;
  }
  const listing = items.listing;
  if (!isObject(listing)) {
    return undefined;
  }

  return listing as NextListing;
};

const extractItemsFromListing = (listing: NextListing): XScraper["items"] => {
  if (!Array.isArray(listing.items)) {
    return [];
  }

  return listing.items
    .map((item) => {
      const siteCode = typeof item.auctionId === "string" ? item.auctionId : "";
      const title = typeof item.title === "string" ? item.title : "";

      if (!siteCode || !title) {
        return undefined;
      }

      const auctionPrice = parseNonDecimalInt(item.price);
      const buyoutPrice = parseNonDecimalInt(item.buyNowPrice);

      const prices: Prices = [];
      if (item.isFixedPrice) {
        if (buyoutPrice >= 0) {
          prices.push({ label: "即決", value: buyoutPrice });
        } else if (auctionPrice >= 0) {
          prices.push({ label: "即決", value: auctionPrice });
        }
      } else {
        if (auctionPrice >= 0) {
          prices.push({ label: "現在", value: auctionPrice });
        }
        if (buyoutPrice >= 0) {
          prices.push({ label: "即決", value: buyoutPrice });
        }
      }

      if (prices.length === 0) {
        return undefined;
      }

      return {
        siteCode,
        url: `https://auctions.yahoo.co.jp/jp/auction/${siteCode}`,
        title,
        imageURL: typeof item.imageUrl === "string" ? item.imageUrl : "",
        prices,
      };
    })
    .filter((item): item is XScraper["items"][number] => Boolean(item));
};

const extractHasMoreFromListing = (
  listing: NextListing,
  page: number,
  currentItemCount: number,
): boolean => {
  const total = parseNonDecimalInt(listing.totalResultsAvailable);
  const limit =
    parseNonDecimalInt(listing.metadata?.limit) || MAX_RESULTS_PER_PAGE;

  if (total < 0 || limit <= 0) {
    return false;
  }

  const loadedItemCount = (page - 1) * limit + currentItemCount;
  return loadedItemCount < total;
};

const nextDataToScraper = (nextData: unknown, page: number): XScraper => {
  const listing = getListingFromNextData(nextData);
  if (!listing) {
    return {
      hasMore: false,
      items: [],
    };
  }

  const items = extractItemsFromListing(listing);
  return {
    hasMore: extractHasMoreFromListing(listing, page, items.length),
    items,
  };
};

const BASE_URL = "https://auctions.yahoo.co.jp/search/search";
const MAX_RESULTS_PER_PAGE = 100;

// Yahoo blocks some datacenter/region IPs, so YAJ can optionally go through a proxy.
const makeProxyAgent = (proxyUrl: string): HttpsProxyAgent<string> => {
  let parsed: URL;
  try {
    parsed = new URL(proxyUrl);
  } catch {
    throw new Error("YAJ_PROXY_URL is not a valid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("YAJ_PROXY_URL must use http:// or https://");
  }
  // only the host is logged, never the credentials
  logger.info(`YAJ requests will go through proxy ${parsed.protocol}//${parsed.host}`);
  return new HttpsProxyAgent(proxyUrl);
};

export default class YAJ implements IExtractor<YAJItem, SearchParams> {
  private proxyAgent?: HttpsProxyAgent<string>;

  constructor(proxyUrl = process.env.YAJ_PROXY_URL) {
    if (proxyUrl) {
      this.proxyAgent = makeProxyAgent(proxyUrl);
    }
  }

  isEnabled() {
    return true;
  }
  async search({ page = 1, query }: SearchParams): Promise<ResultSet<YAJItem>> {
    const searchParams = new URLSearchParams({
      exflag: "1",
      n: MAX_RESULTS_PER_PAGE.toString(),
      b: ((page - 1) * MAX_RESULTS_PER_PAGE + 1).toString(),
      p: query,
      va: query,
    });
    const url = `${BASE_URL}?${searchParams.toString()}`;
    logger.info(JSON.stringify({ url, query, page }));

    const startedAt = Date.now();
    let response;
    try {
      response = await axios.get<string>(url, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        },
        responseType: "text",
        ...(this.proxyAgent
          // proxy: false stops axios applying its own (env-based) proxy on top
          ? { httpsAgent: this.proxyAgent, proxy: false as const }
          : {}),
      });
    } catch (err) {
      logger.err(
        `YAJ upstream request failed after ${Date.now() - startedAt}ms ` +
          `(viaProxy: ${Boolean(this.proxyAgent)}): ` +
          JSON.stringify(describeError(err)),
      );
      throw err;
    }
    const { data, status, headers } = response;
    logger.info(JSON.stringify({
      yajUpstream: {
        status,
        viaProxy: Boolean(this.proxyAgent),
        ms: Date.now() - startedAt,
        contentType: headers?.["content-type"],
        length: typeof data === "string" ? data.length : undefined,
        // where we ended up after redirects (e.g. a login/consent/block page)
        finalUrl: (response.request as { res?: { responseUrl?: string } })?.res?.responseUrl,
      },
    }));

    const nextData = extractNextData(data);
    const scraped = nextDataToScraper(nextData, page);
    logger.info(
      `YAJ Search: ${query} page ${page} returned ${scraped.items.length} items`,
    );
    return scraperToResultSet(scraped);
  }
}
