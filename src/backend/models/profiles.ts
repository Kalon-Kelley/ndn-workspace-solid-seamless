import { Certificate, generateSigningKey, CertNaming, ECDSA, createSigner, createVerifier, type PrivateKey, type PublicKey, type NamedSigner, type NamedVerifier, type SigningAlgorithm } from '@ndn/keychain'
import { base64ToBytes, bytesToBase64 } from '../../utils'
import { Decoder, Encoder } from '@ndn/tlv'
import { Component, Data, ValidityPeriod, Name, type NameLike } from '@ndn/packet'
import { TypedModel } from './typed-models'

export type Profile = {
  workspaceName: string
  nodeId: string
  trustAnchorB64: string
  prvKeyB64: string
  ownCertificateB64: string
}

export const profiles = new TypedModel<Profile>('profiles', (profile) => profile.nodeId)

export function toBootParams(profile: Profile) {
  const prvKey = base64ToBytes(profile.prvKeyB64)
  const anchorBytes = base64ToBytes(profile.trustAnchorB64)
  const trustAnchor = Certificate.fromData(Decoder.decode(anchorBytes, Data))
  const certBytes = base64ToBytes(profile.ownCertificateB64)
  const ownCertificate = Certificate.fromData(Decoder.decode(certBytes, Data))
  return {
    trustAnchor,
    prvKey,
    ownCertificate,
  }
}

export function fromBootParams(params: {
  trustAnchor: Certificate
  prvKey: Uint8Array
  ownCertificate: Certificate
}): Profile {
  const certWire = Encoder.encode(params.ownCertificate.data)
  const certB64 = bytesToBase64(certWire)

  const anchorWire = Encoder.encode(params.trustAnchor.data)
  const anchorB64 = bytesToBase64(anchorWire)

  const prvKeyB64 = bytesToBase64(params.prvKey)

  const nodeId = params.ownCertificate.name.getPrefix(params.ownCertificate.name.length - 4)
  const appPrefix = params.trustAnchor.name.getPrefix(params.trustAnchor.name.length - 4)

  return {
    workspaceName: appPrefix.toString(),
    nodeId: nodeId.toString(),
    trustAnchorB64: anchorB64,
    prvKeyB64: prvKeyB64,
    ownCertificateB64: certB64,
  }
}

export async function createWorkspace(workspaceName: string, user: string) {
  let wsPvt: PrivateKey
  let wsPub: PublicKey
  [wsPvt, wsPub] = await generateSigningKey(workspaceName)
  const cert = await Certificate.selfSign({
    privateKey: wsPvt as NamedSigner.PrivateKey,
    publicKey: wsPub as NamedVerifier.PublicKey,
  })
  const keyName = CertNaming.makeKeyName(Name.from(user as NameLike))
  const algo = ECDSA
  const gen = await algo.cryptoGenerate({}, true)
  const userPvt = createSigner(keyName, algo, gen)
  const userPub = createVerifier(keyName, algo, gen)
  const prvKeyBits = await crypto.subtle.exportKey('pkcs8', gen.privateKey)
  const userCert = await Certificate.issue({
    issuerPrivateKey: wsPvt as NamedSigner.PrivateKey,
    publicKey: userPub,
    issuerId: Component.from(workspaceName.replace(/^\//, '')),
    validity: ValidityPeriod.daysFromNow(365),
  })
  await profiles.save(fromBootParams({
    trustAnchor: cert,
    prvKey: new Uint8Array(prvKeyBits),
    ownCertificate: userCert,
  }))
}
