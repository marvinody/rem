import fs from "fs";
import path from "path";
import nock from "nock";

import Surugaya from "../../src/extractors/Surugaya";
import { Sites } from "../../src/extractors/IExtractor";

const fixture = fs.readFileSync(
  path.join(process.cwd(), "spec", "fixtures", "surugaya", "search.html"),
  "utf8",
);

describe("Surugaya Extractor", () => {
  it("scrapes items using the red price and parses the site code", async () => {
    const scope = nock("https://www.suruga-ya.jp")
      .get("/search")
      .query({ search_word: "rem card", is_marketplace: "0", page: "1" })
      .reply(200, fixture, { "content-type": "text/html; charset=utf-8" });

    const result = await new Surugaya().search({ query: "rem card" });

    expect(scope.isDone()).toBe(true);
    expect(result.hasMore).toBe(true);
    expect(result.items).toEqual([
      {
        site: Sites.SURUGAYA,
        title: "Rem Trading Card",
        url: "https://www.suruga-ya.jp/product/detail/601234567?tenpo_cd=400433",
        price: 1280,
        siteCode: "601234567",
        imageURL: "https://www.suruga-ya.jp/database/photo.php?shinaban=601234567",
      },
      {
        site: Sites.SURUGAYA,
        title: "Rem Tapestry",
        url: "https://www.suruga-ya.jp/product/detail/601999999",
        price: 980,
        siteCode: "601999999",
        imageURL: "https://www.suruga-ya.jp/database/photo.php?shinaban=601999999",
      },
    ]);
  });

  it("resolves to an empty set when the upstream request fails", async () => {
    // x-ray's default superagent driver swallows HTTP errors
    nock("https://www.suruga-ya.jp").get("/search").query(true).reply(500);

    await expectAsync(new Surugaya().search({ query: "rem card" })).toBeResolvedTo({
      hasMore: false,
      items: [],
    });
  });
});
