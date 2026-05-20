const express = require("express");
const app = express();
const port = process.env.PORT || 3001;
const https = require('https');

function getSearchResponse() {
    const username = process.env.BONSAI_ACCESS_KEY;
    const password = process.env.BONSAI_ACCESS_SECRET;
    const auth = btoa(`${username}:${password}`);
    const url = new URL(process.env.BONSAI_URL);

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname || '/',
            method: 'GET',
            servername: process.env.BONSAI_HOST,  // SNI
            headers: {
                'Host': process.env.BONSAI_HOST,
                'User-Agent': 'RenderTest-v1.0',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`,
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.end();
    });
};
app.get("/debug", async (req, res) => {
    const net = require('net');
    const url = new URL(process.env.BONSAI_URL);
    const host = url.hostname;
    const port = parseInt(url.port) || 80;

    const result = await new Promise((resolve) => {
        const socket = net.createConnection({ host, port }, () => {
            // Send a minimal raw HTTP request
            socket.write(`GET / HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`);
        });

        let data = '';
        socket.on('data', (chunk) => { data += chunk.toString('hex'); });
        socket.on('close', () => resolve({ status: 'closed', data }));
        socket.on('error', (e) => resolve({ error: e.message, code: e.code }));
        socket.setTimeout(5000, () => {
            socket.destroy();
            resolve({ error: 'timeout' });
        });
    });

    res.json({ host, port, result });
});
app.get("/", async (req, res) => {  // async handler
    let result;
    try {
        result = JSON.stringify(await getSearchResponse(), null, 2);
} catch (e) {
    result = JSON.stringify({
        message: e.message,
        cause: e.cause ? { message: e.cause.message, code: e.cause.code } : null,
        stack: e.stack,
    }, null, 2);
}
    const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Hello from Render!</title>
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js"></script>
    <script>
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          disableForReducedMotion: true
        });
      }, 500);
    </script>
    <style>
      @import url("https://p.typekit.net/p.css?s=1&k=vnd5zic&ht=tk&f=39475.39476.39477.39478.39479.39480.39481.39482&a=18673890&app=typekit&e=css");
      @font-face {
        font-family: "neo-sans";
        src: url("https://use.typekit.net/af/00ac0a/00000000000000003b9b2033/27/l?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n7&v=3") format("woff2"), url("https://use.typekit.net/af/00ac0a/00000000000000003b9b2033/27/d?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n7&v=3") format("woff"), url("https://use.typekit.net/af/00ac0a/00000000000000003b9b2033/27/a?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n7&v=3") format("opentype");
        font-style: normal;
        font-weight: 700;
      }
      html {
        font-family: neo-sans;
        font-weight: 700;
        font-size: calc(62rem / 16);
      }
      body {
        background: white;
      }
      section {
        border-radius: 1em;
        padding: 1em;
        position: absolute;
        top: 50%;
        left: 50%;
        margin-right: -50%;
        transform: translate(-50%, -50%);
      }
    </style>
  </head>
  <body>
    <section>
      Hello from Render!
    </section>
    <pre>${result}</pre>
  </body>
</html>
`;
    res.type('html').send(html);
});

const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
