import fs from "fs";
import path from "path";
import nock from "nock";

import Mandarake from "../../src/extractors/Mandarake";
import { Sites } from "../../src/extractors/IExtractor";

const fixture = fs.readFileSync(
  path.join(process.cwd(), "spec", "fixtures", "mandarake", "search.html"),
  "utf8",
);

describe("Mandarake Extractor", () => {
  it("scrapes items and pagination through the axios x-ray driver", async () => {
    const scope = nock("https://order.mandarake.co.jp")
      .get("/order/listPage/list")
      .query({ page: "2", soldOut: "1", keyword: "rem figure", dispAdult: "0" })
      .reply(200, fixture, { "content-type": "text/html; charset=utf-8" });

    const result = await new Mandarake().search({ query: "rem figure", page: 2 });

    expect(scope.isDone()).toBe(true);
    expect(result.hasMore).toBe(true);
    expect(result.items).toEqual([
      {
        site: Sites.MANDARAKE,
        title: "Rem Figure 1/7 Scale",
        url: "https://order.mandarake.co.jp/order/detailPage/item?itemCode=1111111111",
        price: 1500,
        siteCode: "1111111111",
        imageURL: "https://img.mandarake.co.jp/webshopimg/01/00/111/0100111111.jpg",
      },
      {
        site: Sites.MANDARAKE,
        title: "Rem Acrylic Stand",
        url: "https://order.mandarake.co.jp/order/detailPage/item?itemCode=2222222222",
        price: 12000,
        siteCode: "2222222222",
        imageURL: "https://img.mandarake.co.jp/webshopimg/01/00/222/0100222222.jpg",
      },
    ]);
  });

  it("reports no more pages when the pager has no next link", async () => {
    nock("https://order.mandarake.co.jp")
      .get("/order/listPage/list")
      .query(true)
      .reply(200, "<html><body><div class=\"thumlarge\"></div></body></html>");

    const result = await new Mandarake().search({ query: "nothing here" });

    expect(result).toEqual({ hasMore: false, items: [] });
  });

  it("rejects when the upstream request fails", async () => {
    spyOn(console, "log");
    nock("https://order.mandarake.co.jp").get("/order/listPage/list").query(true).reply(500);

    await expectAsync(new Mandarake().search({ query: "rem figure" })).toBeRejected();
  });
});
