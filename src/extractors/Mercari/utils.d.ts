type publicKey = {
  key_ops: [
    'verify',
  ],
  ext: boolean,
  kty: string,
  x: string,
  y: string,
  crv: string,
}

type privateKey = publicKey & {
  key_ops: ['sign'],
  d: string,
}

export type keyPair = {
  publicKey: publicKey,
  privateKey: privateKey
}

type paylod = {
  "iat": number
  "jti": string,
  "htu": string,
  "htm": string,
}

export function makeJWTKeys(): Promise<keyPair>
export function makeDPOP(keys: keyPair, payload: paylod): Promise<string>
