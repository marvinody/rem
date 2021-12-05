const { subtle } = require('crypto').webcrypto;

var base64 = exports;

base64.encode = function (unencoded) {
  return Buffer.from(unencoded || '').toString('base64');
};

base64.decode = function (encoded) {
  return Buffer.from(encoded || '', 'base64').toString('utf8');
};

base64.urlEncode = function (unencoded) {
  var encoded = base64.encode(unencoded);
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

base64.urlDecode = function (encoded) {
  encoded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (encoded.length % 4)
    encoded += '=';
  return base64.decode(encoded);
};

const toHexString = bytes =>
  Buffer.from(bytes).toString('hex')

const makeJWTKeys = async () => {
  const {
    publicKey,
    privateKey
  } = await subtle.generateKey({
    name: 'ECDSA',
    namedCurve: 'P-256',
    hash: {
      name: 'SHA-256'
    }
  }, true, ['sign', 'verify']);

  const publicJWT = await subtle.exportKey('jwk', publicKey)
  const privateJWT = await subtle.exportKey('jwk', privateKey)

  return {
    publicKey: publicJWT,
    privateKey: privateJWT
  }
}

const makeDPOPProofJWTHeader = (keys) => {
  return {
    "typ": "dpop+jwt",
    "alg": "ES256",
    "jwk": {
      "crv": keys.publicKey.crv,
      "kty": keys.publicKey.kty,
      "x": keys.publicKey.x,
      "y": keys.publicKey.y,
    }
  }
}

const makeSignVerifyPairs = async (keys) => {
  const sk = await subtle.importKey('jwk', keys.privateKey, {
    name: 'ECDSA',
    namedCurve: 'P-256',
    hash: {
      name: 'SHA-256'
    }
  }, true, ['sign'])

  const pk = await subtle.importKey('jwk', keys.publicKey, {
    name: 'ECDSA',
    namedCurve: 'P-256',
    hash: {
      name: 'SHA-256'
    }
  }, true, ['verify'])

  return {
    sk,
    pk,
  }
}

const sign = async (sk, signingPayload) => {

  const signature = await subtle.sign({
    name: 'ECDSA',
    hash: {
      name: 'SHA-256'
    },
  }, sk, signingPayload)

  return signature;
}


const makeDPOP = async (keys, payload) => {

  const dpopProofJWTHeader = makeDPOPProofJWTHeader(keys);

  const { sk } = await makeSignVerifyPairs(keys);

  const base64Header = base64.urlEncode(JSON.stringify(dpopProofJWTHeader));
  const base64Payload = base64.urlEncode(JSON.stringify(payload));

  const signingPayload = `${base64Header}.${base64Payload}`;

  const signature = await sign(sk, signingPayload);


  const base64Sig = base64.urlEncode(signature);

  const dpop = `${signingPayload}.${base64Sig}`;

  return dpop;
}


module.exports = {
  makeJWTKeys,
  makeDPOP
};

