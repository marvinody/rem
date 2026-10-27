import fs from "fs";
import path from "path";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

import YAJ from "../../src/extractors/YahooAuctionJapan";
import { Sites } from "../../src/extractors/IExtractor";
import { describeError } from "../../src/shared/errorDetails";

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

  it("asks Yahoo for newest listings first", async () => {
    const get = spyOn(axios, "get").and.returnValue(
      Promise.reject(new Error("stop")) as never,
    );

    await expectAsync(new YAJ("").search({ query: "test query", page: 2 })).toBeRejected();

    const params = new URL(get.calls.mostRecent().args[0]).searchParams;
    expect(params.get("s1")).toBe("new");
    expect(params.get("o1")).toBe("d");
    expect(params.get("b")).toBe("101");
  });

  describe("proxy", () => {
    const proxyUrl = "http://user:s3cret@proxy.example:8080";

    it("sends requests directly when no proxy is configured", async () => {
      const get = spyOn(axios, "get").and.returnValue(
        Promise.reject(new Error("stop")) as never,
      );

      await expectAsync(new YAJ("").search({ query: "test query" })).toBeRejected();

      const config = get.calls.mostRecent().args[1] as Record<string, unknown>;
      expect(config.httpsAgent).toBeUndefined();
      expect(config.proxy).toBeUndefined();
    });

    it("routes requests through the configured proxy", async () => {
      const get = spyOn(axios, "get").and.returnValue(
        Promise.reject(new Error("stop")) as never,
      );

      await expectAsync(new YAJ(proxyUrl).search({ query: "test query" })).toBeRejected();

      const config = get.calls.mostRecent().args[1] as Record<string, unknown>;
      expect(config.httpsAgent).toEqual(jasmine.any(HttpsProxyAgent));
      expect((config.httpsAgent as HttpsProxyAgent<string>).proxy.host).toBe(
        "proxy.example:8080",
      );
      expect(config.proxy).toBe(false);
    });

    it("rejects an invalid proxy URL", () => {
      expect(() => new YAJ("not a url")).toThrowError("YAJ_PROXY_URL is not a valid URL");
      expect(() => new YAJ("socks5://proxy.example:1080")).toThrowError(
        "YAJ_PROXY_URL must use http:// or https://",
      );
    });

    it("keeps proxy credentials out of error details", () => {
      const err = Object.assign(new Error("Request failed with status code 500"), {
        isAxiosError: true,
        config: {
          method: "get",
          url: "https://auctions.yahoo.co.jp/search/search",
          httpsAgent: new HttpsProxyAgent(proxyUrl),
          proxy: false,
        },
        response: { status: 500, statusText: "", headers: {}, data: "blocked" },
      });

      expect(JSON.stringify(describeError(err))).not.toContain("s3cret");
    });
  });
});
