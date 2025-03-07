import {
  Card,
  CardContent,
  CardHeader,
  TextField,
  IconButton,
  Typography,
  Backdrop,
  Button,
  Stack,
  Divider,
} from '@suid/material'
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  QrCodeScanner as QRIcon,
} from '@suid/icons-material'
import { Component } from '@ndn/packet'
import { Show, createEffect, createSignal } from 'solid-js'
import { ECDSA, createSigner } from "@ndn/keychain"

export default function GenerateCertificate(props: {
  issuerPrvKey: Uint8Array | undefined
  issuerPubKey: Uint8Array | undefined
  issuerId: Component | undefined
}) {
  const [csr, setCsr] = createSignal('')
  const [expanded, setExpanded] = createSignal(true);

  const onGenerate = () => {
    console.log('Generating certificate for specified identity')
    // const gen = await ECDSA.cryptoGenerate({}, true)
    // const prvKey = createSigner(keyName, algo, gen)
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
