import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Button,
  TextField,
  Stack,
} from '@suid/material'
import { PersonAdd as PersonAddIcon, PlayArrow as PlayArrowIcon, Delete as DeleteIcon } from '@suid/icons-material'
import { Profile, toBootParams as profileToBootParams, profiles as db, createWorkspace } from '../../backend/models/profiles'
import { For, createEffect, createSignal } from 'solid-js'
import { useNdnWorkspace } from '../../Context'
import { useNavigate } from '@solidjs/router'

export default function Profiles() {
  const { booted, bootstrapWorkspace } = useNdnWorkspace()!
  const [profiles, setProfiles] = createSignal<Profile[]>([])
  const [workspaceUri, setWorkspaceUri] = createSignal('')
  const [workspaceProfile, setWorkspaceProfile] = createSignal('')
  const navigate = useNavigate()

  createEffect(() => {
    db.loadAll().then((items) => setProfiles(items))
  })

  createEffect(() => {
    if (booted()) {
      navigate('/workspace', { replace: true })
    }
  })

  const onRun = (id: number) => {
    const item = profiles()[id]
    if (item !== undefined) {
      const params = profileToBootParams(item)
      bootstrapWorkspace({ ...params }).then(() => {
        navigate('/workspace', { replace: true })
      })
    }
  }

  const onRemove = (id: number) => {
    const item = profiles()[id]
    if (item !== undefined) {
      db.remove(item.nodeId)
        .then(() => db.loadAll())
        .then((items) => setProfiles(items))
    }
  }

  const onCreateWorkspace = () => {
    const uri = workspaceUri().trim()
    const profile = workspaceProfile().trim()
    if (uri) {
      console.log('Create workspace with URI:', uri, ' And Profile:', profile)
      createWorkspace(uri, profile)
        .then(() => db.loadAll())
        .then((items) => setProfiles(items))
    }
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Toolbar>
          <Typography sx={{ flex: '1 1 100%' }} variant="h6" component="div">
            Profiles
          </Typography>
          <Button onClick={() => navigate('/convert-testbed', { replace: true })} variant="outlined" color="secondary">
            Convert
          </Button>
          <IconButton onClick={() => navigate('/workspace', { replace: true })}>
            <PersonAddIcon color="primary" />
          </IconButton>
        </Toolbar>
        <Box sx={{ display: "flex", gap: 2, alignItems: "stretch", p: 2 }}>
          <Stack spacing={1} sx={{ flex: 1 }}>
            <TextField
              fullWidth
              required
              label="Workspace URI"
              name="workspace-uri"
              type="text"
              inputProps={{
                style: {
                  'font-family': '"Roboto Mono", ui-monospace, monospace',
                  'white-space': 'pre',
                },
              }}
              value={workspaceUri()}
              onChange={(event) => setWorkspaceUri(event.target.value)}
            />
            <TextField
              fullWidth
              required
              label="Workspace Profile"
              name="workspace-profile"
              type="text"
              inputProps={{
                style: {
                  'font-family': '"Roboto Mono", ui-monospace, monospace',
                  'white-space': 'pre',
                },
              }}
              value={workspaceProfile()}
              onChange={(event) => setWorkspaceProfile(event.target.value)}
            />
          </Stack>
          <Button onClick={onCreateWorkspace} variant="contained" color="primary">
            Create Workspace
          </Button>
        </Box>
        <TableContainer>
          <Table sx={{ minWidth: 300 }}>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <For each={profiles()}>
                {(item, i) => (
                  <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell component="th" scope="row">
                      <Typography color="primary" fontFamily='"Roboto Mono", ui-monospace, monospace' component="span">
                        {item.workspaceName}
                      </Typography>
                      <Typography fontFamily='"Roboto Mono", ui-monospace, monospace' component="span">
                        {item.nodeId.substring(item.workspaceName.length)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={() => {
                          onRun(i())
                        }}
                      >
                        <PlayArrowIcon color="success" />
                      </IconButton>
                      <IconButton
                        onClick={() => {
                          onRemove(i())
                        }}
                      >
                        <DeleteIcon color="error" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
}
