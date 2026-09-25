const http = require("http");
const fs = require("fs");
const path = require("path");
const { TikTokLiveConnection, WebcastEvent } = require("tiktok-live-connector");

const PORT = process.env.PORT || 3000;

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

const TIKTOK_USERNAME = "Galendereall";
const TWITCH_USERNAME = "Galendereal";

let twitchToken = null;
let twitchTokenExpires = 0;

let twitchData = {
  live: false,
  viewers: 0
};

let tiktokData = {
  live: false,
  viewers: 0
};


/* =========================
   TWITCH
========================= */

async function getTwitchToken() {
  if (twitchToken && Date.now() < twitchTokenExpires) {
    return twitchToken;
  }

  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    throw new Error("Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET");
  }

  const body = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    client_secret: TWITCH_CLIENT_SECRET,
    grant_type: "client_credentials"
  });

  const response = await fetch(
    "https://id.twitch.tv/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    }
  );

  if (!response.ok) {
    throw new Error(`Twitch auth failed: ${response.status}`);
  }

  const data = await response.json();

  twitchToken = data.access_token;

  twitchTokenExpires =
    Date.now() + ((data.expires_in - 120) * 1000);

  return twitchToken;
}


async function updateTwitch() {
  try {
    const token = await getTwitchToken();

    const response = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(TWITCH_USERNAME)}`,
      {
        headers: {
          "Client-Id": TWITCH_CLIENT_ID,
          "Authorization": `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Twitch API ${response.status}`);
    }

    const data = await response.json();

    const stream = data.data?.[0];

    if (stream) {
      twitchData = {
        live: true,
        viewers: Number(stream.viewer_count || 0)
      };
    } else {
      twitchData = {
        live: false,
        viewers: 0
      };
    }

  } catch (error) {
    console.error("Twitch:", error.message);

    twitchData = {
      live: false,
      viewers: 0
    };
  }
}


/* =========================
   TIKTOK
========================= */

let tiktokConnection = null;


function createTikTokConnection() {

  /*
   * TikTok-Live-Connector 2.5.0
   * requires an options object.
   */

  tiktokConnection = new TikTokLiveConnection(
    TIKTOK_USERNAME,
    {
      processInitialData: true,
      fetchRoomInfoOnConnect: true
    }
  );


  tiktokConnection.on(
    WebcastEvent.ROOM_USER,
    (data) => {

      const viewers =
        Number(
          data?.viewerCount ??
          data?.totalUserCount ??
          data?.userCount ??
          data?.roomUserCount ??
          0
        );

      if (viewers >= 0) {
        tiktokData = {
          live: true,
          viewers
        };
      }

      console.log(
        `TikTok viewers: ${viewers}`
      );
    }
  );


  tiktokConnection.on(
    WebcastEvent.LIVE_END,
    () => {

      console.log("TikTok LIVE ended");

      tiktokData = {
        live: false,
        viewers: 0
      };
    }
  );


  tiktokConnection.on(
    "disconnected",
    () => {

      console.log("TikTok disconnected");

      tiktokData = {
        live: false,
        viewers: 0
      };

      setTimeout(
        connectTikTok,
        10000
      );
    }
  );
}


async function connectTikTok() {

  try {

    if (!tiktokConnection) {
      createTikTokConnection();
    }

    await tiktokConnection.connect();

    console.log(
      `TikTok connected: @${TIKTOK_USERNAME}`
    );

  } catch (error) {

    console.error(
      "TikTok connection:",
      error.message
    );

    tiktokData = {
      live: false,
      viewers: 0
    };

    tiktokConnection = null;

    setTimeout(
      connectTikTok,
      10000
    );
  }
}


/* =========================
   INITIAL CONNECTIONS
========================= */

connectTikTok();

updateTwitch();


/* =========================
   UPDATE TWITCH
========================= */

setInterval(
  updateTwitch,
  5000
);


/* =========================
   HTTP SERVER
========================= */

const server = http.createServer(
  (req, res) => {

    res.setHeader(
      "Access-Control-Allow-Origin",
      "*"
    );


    /* API */

    if (req.url === "/api/viewers") {

      const total =
        Number(tiktokData.viewers || 0) +
        Number(twitchData.viewers || 0);

      const response = {
        tiktok: tiktokData,
        twitch: twitchData,
        total
      };

      res.writeHead(
        200,
        {
          "Content-Type":
            "application/json; charset=utf-8",
          "Cache-Control":
            "no-store"
        }
      );

      res.end(
        JSON.stringify(response)
      );

      return;
    }


    /* HTML */

    if (
      req.url === "/" ||
      req.url === "/index.html"
    ) {

      try {

        const html =
          fs.readFileSync(
            path.join(
              __dirname,
              "index.html"
            )
          );

        res.writeHead(
          200,
          {
            "Content-Type":
              "text/html; charset=utf-8"
          }
        );

        res.end(html);

      } catch (error) {

        res.writeHead(500);

        res.end(
          "Failed to load index.html"
        );
      }

      return;
    }


    /* NOT FOUND */

    res.writeHead(404);

    res.end("Not found");
  }
);


/* =========================
   START SERVER
========================= */

server.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Galendereal Tracker running on port ${PORT}`
    );

    console.log(
      `TikTok: @${TIKTOK_USERNAME}`
    );

    console.log(
      `Twitch: ${TWITCH_USERNAME}`
    );
  }
);
