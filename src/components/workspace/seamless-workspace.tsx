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
import { Profile, profiles as db, createWorkspace, createUser, addProfile } from '../../backend/models/profiles'

export function CreateWorkspace(props: {
  setProfiles: (value: Array<Profile> | undefined) => void
}) {
  const [workspaceName, setWorkspaceName] = createSignal('')
  const [workspaceIdentity, setWorkspaceIdentity] = createSignal('')
  const [expanded, setExpanded] = createSignal(false);

  const onCreateWorkspace = () => {
    const workspace = workspaceName().trim()
    const identity = workspace.concat('/', workspaceIdentity().trim())
    createWorkspace(workspace, identity)
      .then(() => db.loadAll())
      .then((items) => props.setProfiles(items))
  }

  return (
    <Card>
      <CardHeader
        sx={{ textAlign: "left" }}
        title="Create a Workspace"
        subheader={
          <Typography color="primary" component={'span'}>
            Enter a name for the Workspace and your identity in the workspace
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
              label="Workspace Name"
              name="workspace-name"
              type="text"
              inputProps={{
                style: {
                  'font-family': '"Roboto Mono", ui-monospace, monospace',
                  'white-space': 'pre',
                },
              }}
              value={workspaceName()}
              onChange={(event) => setWorkspaceName(event.target.value)}
            />
            <TextField
              fullWidth
              required
              multiline
              label="Workspace Identity"
              name="workspace-identity"
              type="text"
              inputProps={{
                style: {
                  'font-family': '"Roboto Mono", ui-monospace, monospace',
                  'white-space': 'pre',
                },
              }}
              value={workspaceIdentity()}
              onChange={(event) => setWorkspaceIdentity(event.target.value)}
            />
            <Button onClick={onCreateWorkspace} variant="contained">
              Create Workspace
            </Button>
          </div>
        </CardContent>
      </Show>
    </Card>
  )
}

export function JoinWorkspace(props: {
  setProfiles: (value: Array<Profile> | undefined) => void
}) {
  const [workspaceName, setWorkspaceName] = createSignal('')
  const [workspaceIdentity, setWorkspaceIdentity] = createSignal('')
  const [identityPrvKeyBits, setIdentityPrvKeyBits] = createSignal<Uint8Array>()
  const [csr, setCsr] = createSignal('')
  const [trustAnchor, setTrustAnchor] = createSignal('')
  const [certificate, setCertificate] = createSignal('')
  const [csrGenerated, setCsrGenerated] = createSignal(false);
  const [expanded, setExpanded] = createSignal(false);
  
  const onGenerateCSR = () => {
    const workspace = workspaceName().trim()
    const identity = workspace.concat('/', workspaceIdentity().trim())
    createUser(identity)
      .then(([sscert, pvtKey]) => {
        setIdentityPrvKeyBits(pvtKey)
        setCsr(bytesToBase64(Encoder.encode(sscert.data)))
        setCsrGenerated(true)
      })
  }

  const onJoinWorkspace = () => {
    const trustAnchorCertificate = Certificate.fromData(Decoder.decode(base64ToBytes(trustAnchor()), Data))
    const identityCertificate = Certificate.fromData(Decoder.decode(base64ToBytes(certificate()), Data))
    addProfile(trustAnchorCertificate, identityPrvKeyBits()!, identityCertificate)
      .then(() => db.loadAll())
      .then((items) => props.setProfiles(items))
  }
  
  return (
    <Card>
      <CardHeader
        sx={{ textAlign: "left" }}
        title="Join an existing Workspace"
        subheader={
          <Typography color="primary" component={'span'}>
            Enter the name of the existing workspace and desired identity to generate a CSR, then send the CSR to the workspace owner for signing
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
      <Show when={expanded() && !csrGenerated()}>
        <Divider />
        <CardContent>
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
              label="Workspace Name"
              name="workspace-name"
              type="text"
              inputProps={{
                style: {
                  'font-family': '"Roboto Mono", ui-monospace, monospace',
                  'white-space': 'pre',
                },
              }}
              value={workspaceName()}
              onChange={(event) => setWorkspaceName(event.target.value)}
            />
            <TextField
              fullWidth
              required
              multiline
              label="Workspace Identity"
              name="workspace-identity"
              type="text"
              inputProps={{
                style: {
                  'font-family': '"Roboto Mono", ui-monospace, monospace',
                  'white-space': 'pre',
                },
              }}
              value={workspaceIdentity()}
              onChange={(event) => setWorkspaceIdentity(event.target.value)}
            />
            <Button onClick={onGenerateCSR} variant="contained">
              Generate CSR
            </Button>
          </div>
        </CardContent>
      </Show>
      <Show when={expanded() && csrGenerated()}>
        <Divider />
        <CardContent>
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
              multiline
              label="CSR"
              name="csr"
              type="text"
              inputProps={{
                style: {
                  'font-family': '"Roboto Mono", ui-monospace, monospace',
                  'white-space': 'pre',
                },
              }}
              value={csr()}
            />
            <TextField
              fullWidth
              required
              multiline
              label="Trust Anchor"
              name="trust-anchor"
              type="text"
              inputProps={{
                style: {
                  'font-family': '"Roboto Mono", ui-monospace, monospace',
                  'white-space': 'pre',
                },
              }}
              value={trustAnchor()}
              onChange={(event) => setTrustAnchor(event.target.value)}
            />
            <TextField
              fullWidth
              required
              multiline
              label="Certificate"
              name="certificate"
              type="text"
              inputProps={{
                style: {
                  'font-family': '"Roboto Mono", ui-monospace, monospace',
                  'white-space': 'pre',
                },
              }}
              value={certificate()}
              onChange={(event) => setCertificate(event.target.value)}
            />
            <Button onClick={onJoinWorkspace} variant="contained">
              Join Workspace
            </Button>
          </div>
        </CardContent>
      </Show>
    </Card>
  )
}
