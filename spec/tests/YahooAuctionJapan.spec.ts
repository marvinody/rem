import fs from "fs";
import path from "path";
import axios from "axios";

import YAJ from "../../src/extractors/YahooAuctionJapan";
import { Sites } from "../../src/extractors/IExtractor";

describe("YahooAuctionJapan Extractor", () => {
  it("parses listing items from __NEXT_DATA__ fixture", async () => {
    const fixturePath = path.join(
      process.cwd(),
      "spec",
      "fixtures",
      "yahoo-auction-japan",
      "search-next-data.html",
    );
    const fixtureHtml = fs.readFileSync(fixturePath, "utf8");

    spyOn(axios, "get").and.returnValue(
      Promise.resolve({ data: fixtureHtml } as never),
    );

    const extractor = new YAJ();
    const result = await extractor.search({ query: "test query", page: 1 });

    expect(result.items.length).toBe(2);
    expect(result.hasMore).toBe(false);

    const first = result.items[0];
    expect(first.site).toBe(Sites.YAJ);
    expect(first.siteCode.length).toBeGreaterThan(0);
    expect(first.title.length).toBeGreaterThan(0);
    expect(first.url).toContain("/jp/auction/");
    expect(first.price).toBeGreaterThanOrEqual(0);
  });
});
