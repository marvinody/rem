import nock from "nock";
import { webcrypto } from "crypto";

import Mercari from "../../src/extractors/Mercari/Mercari";
import { makeDPOP, makeJWTKeys } from "../../src/extractors/Mercari/utils.js";
import { Sites } from "../../src/extractors/IExtractor";

const { subtle } = webcrypto as unknown as { subtle: SubtleCrypto };

type DPoPHeader = {
  typ: string;
  alg: string;
  jwk: JsonWebKey;
};

const decodeSegment = <T>(segment: string) =>
  JSON.parse(Buffer.from(segment, "base64").toString("utf8")) as T;

describe("Mercari DPoP utils", () => {
  it("produces an ES256 DPoP JWT whose signature verifies against its embedded key", async () => {
    const keys = await makeJWTKeys();
    const payload = { iat: 1700000000, jti: "test", htu: "https://example.com", htm: "POST" };

    const dpop = await makeDPOP(keys, payload);
    const [header, body, signature] = dpop.split(".");

    const decodedHeader = decodeSegment<DPoPHeader>(header);
    expect(decodedHeader.typ).toBe("dpop+jwt");
    expect(decodedHeader.alg).toBe("ES256");
    expect(decodedHeader.jwk.kty).toBe("EC");
    expect(decodedHeader.jwk.crv).toBe("P-256");
    expect(decodedHeader.jwk.d).toBeUndefined();
    expect(decodeSegment<typeof payload>(body)).toEqual(payload);
    // base64url, no padding
    expect(dpop).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

    const publicKey = await subtle.importKey(
      "jwk",
      decodedHeader.jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const verified = await subtle.verify(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      publicKey,
      Buffer.from(signature, "base64"),
      Buffer.from(`${header}.${body}`),
    );
    expect(verified).toBe(true);
  });
});

describe("Mercari Extractor", () => {
  it("posts a signed search request and maps sale and auction items", async () => {
    let sentBody: any;
    let sentDpop: string | undefined;
    const scope = nock("https://api.mercari.jp")
      .post("/v2/entities:search", (body) => {
        sentBody = body;
        return true;
      })
      .reply(function () {
        sentDpop = this.req.headers.dpop;
        return [
          200,
          {
            result: "OK",
            meta: { nextPageToken: "v1:2", numFound: 2 },
            items: [
              {
                sellerId: 1,
                id: "m123",
                name: "Rem Figure",
                price: "3000",
                thumbnails: ["https://static.mercdn.net/m123.jpg"],
                itemType: "ITEM_TYPE_MERCARI",
                created: 1,
                updated: 1,
              },
              {
                sellerId: 2,
                id: "shopItem456",
                name: "Rem Plush",
                price: "4500",
                thumbnails: [],
                itemType: "ITEM_TYPE_BEYOND",
                created: 1,
                updated: 1,
                auction: { totalBid: "3", highestBid: "4500" },
              },
            ],
          },
        ];
      });

    const result = await new Mercari().search({ query: "rem figure", page: 2 });

    expect(scope.isDone()).toBe(true);
    expect(sentBody.pageToken).toBe("v1:1");
    expect(sentBody.searchCondition.keyword).toBe("rem figure");
    expect(sentDpop).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

    expect(result.hasMore).toBe(true);
    expect(result.items).toEqual([
      {
        imageURL: "https://static.mercdn.net/m123.jpg",
        site: Sites.MERCARI,
        price: 3000,
        siteCode: "m123",
        title: "Rem Figure",
        url: "https://jp.mercari.com/item/m123",
        type: "SALE",
        auction: undefined,
      },
      {
        imageURL: "",
        site: Sites.MERCARI,
        price: 4500,
        siteCode: "shopItem456",
        title: "Rem Plush",
        url: "https://jp.mercari.com/shops/product/shopItem456",
        type: "AUCTION",
        // passed through as strings from the API today
        auction: { totalBids: "3", highestBid: "4500" },
      },
    ] as any);
  });
});
