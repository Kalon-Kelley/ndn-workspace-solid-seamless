import { Certificate, generateSigningKey, CertNaming, ECDSA, createSigner, createVerifier, type PrivateKey, type PublicKey, type NamedSigner, type NamedVerifier, type SigningAlgorithm } from '@ndn/keychain'
import { base64ToBytes, bytesToBase64 } from '../../utils'
import { Decoder, Encoder } from '@ndn/tlv'
import { Component, Data, ValidityPeriod, Name, type NameLike } from '@ndn/packet'
import { TypedModel } from './typed-models'

export type Issuer = {
  prvKeyB64: string
  pubKeyB64: string
  id: string
}

export type Profile = {
  workspaceName: string
  nodeId: string
  trustAnchorB64: string
  prvKeyB64: string
  ownCertificateB64: string
  issuer?: Issuer
}

export const profiles = new TypedModel<Profile>('profiles', (profile) => profile.nodeId)

export function toBootParams(profile: Profile) {
  const prvKey = base64ToBytes(profile.prvKeyB64)
  const anchorBytes = base64ToBytes(profile.trustAnchorB64)
  const trustAnchor = Certificate.fromData(Decoder.decode(anchorBytes, Data))
  const certBytes = base64ToBytes(profile.ownCertificateB64)
  const ownCertificate = Certificate.fromData(Decoder.decode(certBytes, Data))
  let issuer
  if (profile.issuer) {
    issuer = {
      prvKey: base64ToBytes(profile.issuer.prvKeyB64),
      pubKey: base64ToBytes(profile.issuer.pubKeyB64),
      id: Component.from(profile.issuer.id),
    }
  }
  return {
    trustAnchor,
    prvKey,
    ownCertificate,
    ...(issuer && { issuer }),
  }
}

export function fromBootParams(params: {
  trustAnchor: Certificate
  prvKey: Uint8Array
  ownCertificate: Certificate
  issuer?: {
    prvKey: Uint8Array
    pubKey: Uint8Array
    id: Component
  }
}): Profile {
  const certWire = Encoder.encode(params.ownCertificate.data)
  const certB64 = bytesToBase64(certWire)

  const anchorWire = Encoder.encode(params.trustAnchor.data)
  const anchorB64 = bytesToBase64(anchorWire)

  const prvKeyB64 = bytesToBase64(params.prvKey)

  const nodeId = params.ownCertificate.name.getPrefix(params.ownCertificate.name.length - 4)
  const appPrefix = params.trustAnchor.name.getPrefix(params.trustAnchor.name.length - 4)

  let issuer: Issuer | undefined
  if (params.issuer) {
    issuer = {
      prvKeyB64: bytesToBase64(params.issuer.prvKey),
      pubKeyB64: bytesToBase64(params.issuer.pubKey),
      id: params.issuer.id.toString(),
    }
  }

  return {
    workspaceName: appPrefix.toString(),
    nodeId: nodeId.toString(),
    trustAnchorB64: anchorB64,
    prvKeyB64: prvKeyB64,
    ownCertificateB64: certB64,
    ...(issuer && { issuer }),
  }
}

export async function createWorkspace(workspaceName: string, user: string) {
  const algo = ECDSA
  const wsKeyName = CertNaming.makeKeyName(Name.from(workspaceName as NameLike))
  // TODO(kalon-kelley) see if this like that of workspaceName so it doesn't
  // have to be saved also
  const wsGen = await algo.cryptoGenerate({}, true)
  const wsPvt = createSigner(wsKeyName, algo, wsGen)
  const wsPub = createVerifier(wsKeyName, algo, wsGen)
  const wsPrvKeyBits = await crypto.subtle.exportKey('pkcs8', wsGen.privateKey)
  const wsPubKeyBits = await crypto.subtle.exportKey('spki', wsGen.publicKey);
  const wsCert = await Certificate.selfSign({
    privateKey: wsPvt,
    publicKey: wsPub,
  })
  const userKeyName = CertNaming.makeKeyName(Name.from(user as NameLike))
  const userGen = await algo.cryptoGenerate({}, true)
  const userPvt = createSigner(userKeyName, algo, userGen)
  const userPub = createVerifier(userKeyName, algo, userGen)
  const userPrvKeyBits = await crypto.subtle.exportKey('pkcs8', userGen.privateKey)
  const issuerId = Component.from(workspaceName.replace(/^\//, ''))
  const userCert = await Certificate.issue({
    issuerPrivateKey: wsPvt as NamedSigner.PrivateKey,
    publicKey: userPub,
    issuerId: issuerId,
    validity: ValidityPeriod.daysFromNow(365),
  })
  await profiles.save(fromBootParams({
    trustAnchor: wsCert,
    prvKey: new Uint8Array(userPrvKeyBits),
    ownCertificate: userCert,
    issuer: {
      prvKey: new Uint8Array(wsPrvKeyBits),
      pubKey: new Uint8Array(wsPubKeyBits),
      id: issuerId,
    }
  }))
}

export async function createUser(user: string): Promise<[Certificate, Uint8Array]> {
  const algo = ECDSA
  const keyName = CertNaming.makeKeyName(Name.from(user as NameLike))
  const gen = await algo.cryptoGenerate({}, true)
  const pvt = createSigner(keyName, algo, gen)
  const pub = createVerifier(keyName, algo, gen)
  const prvKeyBits = await crypto.subtle.exportKey('pkcs8', gen.privateKey)
  const ssCert = await Certificate.selfSign({
    privateKey: pvt,
    publicKey: pub,
  })
  return [ssCert, new Uint8Array(prvKeyBits)]
}

export async function addProfile(trustAnchor: Certificate, prvKey: Uint8Array, ownCertificate: Certificate) {
  await profiles.save(fromBootParams({
    trustAnchor,
    prvKey,
    ownCertificate,
  }))
}
