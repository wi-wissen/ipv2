# [wip] ipv2.cc

Look at the [Nuxt 3 documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Available URLs

```
/clients/browser  # Browser client
/clients/dhcp     # DHCP client
/clients/dns      # DNS client
/clients/http     # HTTP client
```

## Environment Setup

The project requires a Pusher-compatible WebSocket server. We recommend using [Soketi](https://docs.soketi.app/), which is an open-source, self-hosted WebSocket server.

Alternative Pusher-compatible servers:
- [Pusher](https://pusher.com/) (hosted service)
- [Laravel WebSockets](https://github.com/beyondcode/laravel-websockets) (self-hosted)
- [Socket.IO](https://socket.io/) with [socket.io-pusher](https://github.com/socketsupply/socket.io-pusher)

### Soketi Setup

1. Install Soketi:
   ```bash
   npm install -g @soketi/soketi
   ```

2. Start Soketi server:
   ```bash
   soketi start
   ```

3. Rename `.env.example` to `.env` and configure:
   ```env
   DEBUG=false
   SOKETI_HOST=localhost
   SOKETI_PORT=6001
   SOKETI_TLS=false
   SOKETI_APP_KEY=app-key
   ```

## Setup

Make sure to install the dependencies:

```bash
# npm
npm install
# pnpm
pnpm install
# yarn
yarn install
# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev
# pnpm
pnpm run dev
# yarn
yarn dev
# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build
# pnpm
pnpm run build
# yarn
yarn build
# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview
# pnpm
pnpm run preview
# yarn
yarn preview
# bun
bun run preview
```

## Todo List

- [ ] Add browser client functionality
- [ ] Test DHCP client implementation
- [ ] Test DNS client features
- [ ] Test HTTP client functionality
- [ ] Add index.vue routing and layout
- [ ] Perform cross-browser testing
- [ ] Test responsive design
- [ ] Improve error handling
- [ ] Document API endpoints