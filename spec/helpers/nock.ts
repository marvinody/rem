import nock from "nock";

// No spec should ever reach a real site; supertest still needs loopback.
beforeAll(() => {
  nock.disableNetConnect();
  nock.enableNetConnect(/127\.0\.0\.1|localhost/);
});

afterEach(() => {
  nock.cleanAll();
});
