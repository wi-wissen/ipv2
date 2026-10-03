import { handleMessage } from '../utils/networkHub.js'

export default defineWebSocketHandler({
  message(peer, message) {
    handleMessage(peer, message.text())
  },
})
