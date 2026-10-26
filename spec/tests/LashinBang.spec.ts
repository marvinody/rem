import nock from "nock";

import LashinBang from "../../src/extractors/LashinBang/LashinBang";
import { Sites } from "../../src/extractors/IExtractor";

const payload = (currentPage: number, lastPage: number) => ({
  kotohaco: {
    result: {
      info: { current_page: currentPage, last_page: lastPage },
      items: [
        {
          itemid: "A001",
          title: "Rem Tapestry",
          url: "https://shop.lashinbang.com/products/detail/A001",
          image: "https://img.lashinbang.com/A001.jpg",
          price: 3300,
          narrow1: "2",
          narrow2: "KADOKAWA",
        },
        {
          itemid: "A002",
          title: "Rem Doujinshi",
          url: "https://shop.lashinbang.com/products/detail/A002",
          image: "https://img.lashinbang.com/A002.jpg",
          price: 800,
          narrow1: "1",
          narrow2: "Circle",
        },
      ],
    },
  },
});

describe("LashinBang Extractor", () => {
  it("unwraps the JSONP response and maps items", async () => {
    const scope = nock("https://lashinbang-f-s.snva.jp")
      .get("/")
      .query((q) => q.q === "rem tapestry" && q.o === "1" && q.callback === "callback")
      .reply(200, `callback(${JSON.stringify(payload(2, 5))});`);

    const result = await new LashinBang().search({ query: "rem tapestry", page: 2 });

    expect(scope.isDone()).toBe(true);
    expect(result).toEqual({
      hasMore: true,
      items: [
        {
          site: Sites.LASHINBANG,
          imageURL: "https://img.lashinbang.com/A001.jpg",
          price: 3300,
          siteCode: "A001",
          title: "Rem Tapestry",
          url: "https://shop.lashinbang.com/products/detail/A001",
          maker: "KADOKAWA",
          nsfw: false,
        },
        {
          site: Sites.LASHINBANG,
          imageURL: "https://img.lashinbang.com/A002.jpg",
          price: 800,
          siteCode: "A002",
          title: "Rem Doujinshi",
          url: "https://shop.lashinbang.com/products/detail/A002",
          maker: "Circle",
          nsfw: true,
        },
      ],
    });
  });

  it("reports no more pages on the last page", async () => {
    nock("https://lashinbang-f-s.snva.jp")
      .get("/")
      .query(true)
      .reply(200, `callback(${JSON.stringify(payload(5, 5))})`);

    const result = await new LashinBang().search({ query: "rem tapestry", page: 6 });

    expect(result.hasMore).toBe(false);
  });
});
