const SITE_NAME = process.env.SITE_NAME || window.location.pathname;
const PORT = process.env.PORT || 8080;

const socket = new WebSocket(`wss://${SITE_NAME}:${PORT}`);

socket.addEventListener('open', () => {
  socket.send('[⌚️ Tokei] Connection from client established.');
});

socket.addEventListener('message', async (event) => {
  if (event.data !== 'change') {
    return;
  }

  window.location.reload();
});
