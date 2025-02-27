import { Certificate, generateSigningKey, type PrivateKey, type PublicKey, type NamedSigner, type NamedVerifier } from '@ndn/keychain'
import { base64ToBytes, bytesToBase64 } from '../../utils'
import { Decoder, Encoder } from '@ndn/tlv'
import { Component, Data, ValidityPeriod } from '@ndn/packet'
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

export async function createWorkspace(workspaceName: string, user: string): Promise<{
  trustAnchor: Certificate;
  prvKey: Uint8Array;
  ownCertificate: Certificate;
}> {
  let wsPvt: PrivateKey
  let wsPub: PublicKey
  [wsPvt, wsPub] = await generateSigningKey(workspaceName)
  const cert = await Certificate.selfSign({
    privateKey: wsPvt as NamedSigner.PrivateKey,
    publicKey: wsPub as NamedVerifier.PublicKey,
  })
  let userPvt: PrivateKey
  let userPub: PublicKey
  [userPvt, userPub] = await generateSigningKey(user)
  const userCert = await Certificate.issue({
    issuerPrivateKey: wsPvt as NamedSigner.PrivateKey,
    publicKey: userPub,
    issuerId: Component.from(workspaceName.replace(/^\//, '')),
    validity: ValidityPeriod.daysFromNow(365),
  })
  // const prvKeyBits = await crypto.subtle.exportKey('pkcs8', userPvt)
  // Self sign another certificate for user
  // Issue a certificate with Certificate.issue using trust anchors private key
  //   as private key, public key from user and issuer id as workspaceName w/o
  //   the / and a default validity of 365 days

  // Instead of doing this bootstrapWorkspace here just have the params returned
  // and from onCreateWorkspace call bootstrapWorkspace since it is already
  // included there
  // do some await bootstrapWorkspace .then navigate to /workspace replace: true
  // prvKey is the private key of the user, ownCertificate is also users
  console.log(`${cert.name}\n`)
  console.dir(userPvt)
  return {
    trustAnchor: cert,
    prvKey: new TextEncoder().encode(`${userPvt.name}`),
    ownCertificate: userCert,
  }
}
