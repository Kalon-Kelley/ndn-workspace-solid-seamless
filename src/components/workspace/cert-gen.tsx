import {
  Card,
  CardContent,
  CardHeader,
  TextField,
  IconButton,
  Typography,
  Button,
  Divider,
} from '@suid/material'
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from '@suid/icons-material'
import { base64ToBytes, bytesToBase64 } from '../../utils'
import { Decoder, Encoder } from '@ndn/tlv'
import { Component, Data, Name, ValidityPeriod, type NameLike } from '@ndn/packet'
import { Show, createEffect, createSignal } from 'solid-js'
import { ECDSA, createSigner, createVerifier, Certificate, CertNaming, SigningAlgorithmListFull } from "@ndn/keychain"

export default function GenerateCertificate(props: {
  issuerPrvKey: Uint8Array | undefined
  issuerPubKey: Uint8Array | undefined
  issuerId: Component | undefined
}) {
  const [csr, setCsr] = createSignal('')
  const [expanded, setExpanded] = createSignal(true);

  // Add onCertIssue to issue a certificate for the provided identity (take in
  // the self signed cert as B64 and create a certificate from it)
  // recreate the wsGen using
  // ECDSA.cryptoGenerate({ importPkcs8: [prvKeyBits, pubKeyBits] }, true);
  // then get the signer needed for Certificate.issue
  // createSigner(name, ECDSA, gen)

  const onGenerate = () => {
    console.log('Generating certificate for specified identity')
    if (!props.issuerId || !props.issuerPrvKey || !props.issuerPubKey) {
      return
    }
    ECDSA.cryptoGenerate({ importPkcs8: [props.issuerPrvKey, props.issuerPubKey] }, true)
      .then((gen) => {
        const wsName = CertNaming.makeKeyName(Name.from('test' as NameLike))
        const prvKey = createSigner(wsName, ECDSA, gen)
        createVerifier(Certificate.fromData(Decoder.decode(base64ToBytes(csr()), Data)), { algoList: SigningAlgorithmListFull })
          .then((verifier) => {
            Certificate.issue({
              issuerPrivateKey: prvKey,
              publicKey: verifier,
              issuerId: props.issuerId!,
              validity: ValidityPeriod.daysFromNow(365),
            })
              .then((userCert) => console.log('CERT GENERATED', bytesToBase64(Encoder.encode(userCert.data))))
          })
      })
  }

  return (
    <Show when={props.issuerPrvKey && props.issuerId}>
      <Card>
        <CardHeader
          sx={{ textAlign: "left" }}
          title="Generate Certificates"
          subheader={
            <Typography color="primary" component={'span'}>
              Paste certificate signing request from user and generate
            </Typography>
          }
          action={
            <IconButton onClick={() => setExpanded(!expanded())}>
              <Show when={expanded()} fallback={<ExpandMoreIcon />}>
                <ExpandLessIcon />
              </Show>
            </IconButton>
          }
        />
        <Show when={expanded()}>
          <Divider />
          <CardContent>
            {/* Expandable content goes here */}
            <div
              style={{
                display: 'flex',
                'flex-direction': 'column',
                'align-items': 'flex-end',
                'row-gap': '10px',
              }}
            >
              <TextField
                fullWidth
                required
                multiline
                label="Certificate Signing Request"
                name="csr"
                type="text"
                inputProps={{
                  style: {
                    'font-family': '"Roboto Mono", ui-monospace, monospace',
                    'white-space': 'pre',
                  },
                }}
                value={csr()}
                onChange={(event) => setCsr(event.target.value)}
              />
              <Button onClick={onGenerate} variant="contained">
                Generate
              </Button>
            </div>
          </CardContent>
        </Show>
      </Card>
    </Show>
  )
}
