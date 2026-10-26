import nock from "nock";

import Rakuten from "../../src/extractors/Rakuten";
import { Sites } from "../../src/extractors/IExtractor";

const response = {
  count: 2,
  page: 1,
  pageCount: 3,
  Items: [
    {
      Item: {
        itemCode: "shop:10001",
        itemName: "Rem Figure",
        itemPrice: 4980,
        imageFlag: 1,
        itemUrl: "https://item.rakuten.co.jp/shop/10001/",
        mediumImageUrls: [
          { imageUrl: "https://thumbnail.image.rakuten.co.jp/a.jpg" },
          { imageUrl: "https://thumbnail.image.rakuten.co.jp/b.jpg" },
        ],
      },
    },
    {
      Item: {
        itemCode: "shop:10002",
        itemName: "Rem Poster",
        itemPrice: 1200,
        imageFlag: 0,
        itemUrl: "https://item.rakuten.co.jp/shop/10002/",
        mediumImageUrls: [],
      },
    },
  ],
};

describe("Rakuten Extractor", () => {
  it("maps the Ichiba search API response", async () => {
    const scope = nock("https://app.rakuten.co.jp")
      .get("/services/api/IchibaItem/Search/20170706")
      .query((q) => q.keyword === "rem figure" && q.page === "1")
      .reply(200, response);

    const result = await new Rakuten().search({ query: "rem figure", page: 1 });

    expect(scope.isDone()).toBe(true);
    expect(result).toEqual({
      hasMore: true,
      items: [
        {
          imageURL: "https://thumbnail.image.rakuten.co.jp/a.jpg",
          site: Sites.RAKUTEN,
          price: 4980,
          siteCode: "shop:10001",
          title: "Rem Figure",
          url: "https://item.rakuten.co.jp/shop/10001/",
        },
        {
          imageURL: "",
          site: Sites.RAKUTEN,
          price: 1200,
          siteCode: "shop:10002",
          title: "Rem Poster",
          url: "https://item.rakuten.co.jp/shop/10002/",
        },
      ],
    });
  });

  it("reports no more pages on the last page", async () => {
    nock("https://app.rakuten.co.jp")
      .get("/services/api/IchibaItem/Search/20170706")
      .query(true)
      .reply(200, { ...response, page: 3, Items: [] });

    const result = await new Rakuten().search({ query: "rem figure", page: 3 });

    expect(result).toEqual({ hasMore: false, items: [] });
  });
});
