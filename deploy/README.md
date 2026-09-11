# VM deployment: frontend and backend

This Compose stack runs only the public-facing frontend and application backend
on the VM. Chat/RAG, Ollama, STT, Whisper, and future TTS stay on the model
computer.

```text
Browser --HTTPS--> VM Nginx/frontend --private Docker network--> backend
                                                      |
                                                      | VPN / private LAN only
                                                      v
                                  model computer: Chat/RAG :8002, STT :8001
```

## Before deployment

1. Connect the VM and model computer using a private VPN/overlay network.
   The VM must reach the model computer on TCP ports 8001 and 8002.
2. On the model computer, start Chat/RAG on `0.0.0.0:8002` and STT on
   `0.0.0.0:8001`. Keep Ollama bound locally; Chat/RAG calls it through
   `http://127.0.0.1:11434`.
3. On the VM, copy the environment template and set the real VPN address and a
   strong unique session secret:

   ```bash
   cp deploy/vm.backend.env.example deploy/vm.backend.env
   chmod 600 deploy/vm.backend.env
   ```

4. Put the VM behind HTTPS (for example, a managed load balancer, Caddy, or
   Nginx with a certificate). Set `CORS_ORIGINS` to the resulting public origin.
   The Compose file exposes frontend port 80 by default; set `FRONTEND_PORT`
   before deployment if another local port is required.

## Start and verify

```bash
docker compose build
docker compose up -d
docker compose ps
curl http://127.0.0.1/api/v1/health
```

The frontend calls `/api/v1` on its own origin. Nginx proxies it to the backend
container, so port 8000 is never publicly published. The persistent SQLite
database is stored in the named `backend-data` volume.

## Security

- Never publish model ports 8001, 8002, or 11434 to the public Internet.
- Restrict the model computer firewall so only the VM VPN address can reach
  ports 8001 and 8002.
- The current STT and Chat/RAG services do not have service-to-service
  authentication. Use a private VPN at minimum; add mTLS or an internal token
  before a production Internet-facing deployment.
