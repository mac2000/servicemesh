const http = require("http");
const url = require("url");
const dgram = require("dgram");
const os = require("os");
const { StringDecoder } = require("string_decoder");
const { Socket } = require("net");

const parse = str => {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.error(error);
    return {};
  }
};

const port = process.env.PORT || 3000;
const hostname = os.hostname();
const localNetworkBroadcastAddress = "255.255.255.255";

const peers = {};

// demo rest server
const server = http.createServer((req, res) => {
  const method = req.method.toLowerCase();
  const parsed = url.parse(req.url, true);
  const path = parsed.pathname.replace(/^\/+|\/+$/g, "");
  const query = parsed.query;
  const headers = req.headers;

  const decoder = new StringDecoder("utf-8");
  let body = "";
  req.on("data", data => (body += decoder.write(data)));
  req.on("end", () => {
    body += decoder.end();

    if (path === "favicon.ico" && method === "get") {
      res.writeHead(204);
      res.end();
    } else if (path === "ping" && method === "get") {
      res.writeHead(204);
      res.end();
    } else if (path === "peers" && method === "get") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.writeHead(200);
      res.end(JSON.stringify(peers), "utf-8");
    } else if (path === "" && method === "get") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.writeHead(200);
      res.end(JSON.stringify({ hostname, peers }), "utf-8");
    } else {
      res.writeHead(405);
      res.end();
    }

    if (path !== "favicon.ico") {
      console.log({
        kind: "HTTP_REQUEST",
        method,
        path
        // query,
        // headers,
        // body
      });
    }
  });
});

const socket = dgram.createSocket(
  {
    type: "udp4",
    reuseAddr: true
  },
  (buffer, sender) => {
    const { address, port } = sender;

    let message = parse(buffer.toString());
    if (!message) {
      return;
    }

    let { kind, hostname } = message;
    if (!kind || !hostname) {
      return;
    }

    if (kind === "ping") {
      peers[hostname] = address;
      // respond to ping with known peers
      socket.send(JSON.stringify({ kind: "pong", hostname, peers }), port, address);
    } else if (kind === "pong") {
      peers[hostname] = address;
      // merge local and remote peers
      if (message.hasOwnProperty("peers") && message.peers) {
        Object.keys(message.peers).forEach(hostname => {
          peers[hostname] = message.peers[hostname];
        });
      }
    } else if (kind === "bye") {
      peers[hostname] = undefined;
    }

    console.log({ kind, hostname, address });
  }
);

// On start and every 5 seconds ping everyone
socket.on("listening", () => {
  socket.setBroadcast(true);
  setInterval(() => {
    socket.send(JSON.stringify({ kind: "ping", hostname }), port, localNetworkBroadcastAddress);
  }, 5000);
});

// On termination say bye to everyone
process.on("SIGTERM", () => {
  socket.send(JSON.stringify({ kind: "bye", hostname }), port, localNetworkBroadcastAddress);
});

// Every 5 seconds check if known peers alive
setInterval(() => {
  Object.keys(peers)
    .filter(key => key !== hostname)
    .filter(key => peers[key])
    .forEach(hostname => {
      const host = peers[hostname];
      const socket = new Socket();
      const remove = () => (peers[hostname] = undefined);
      socket.on("error", remove);
      socket.on("timeout", remove);
      socket.connect(
        port,
        { host, timeout: 1000 },
        () => {
          socket.end();
        }
      );
    });
}, 5000);

server.listen(port);
socket.bind(port);
