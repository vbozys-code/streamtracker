// GALENDEREAL transparent tracker
// Node.js 18+
// Install:
//   npm install
// Run:
//   node server.js
//
// Then use http://localhost:3000 in OBS Browser Source.
// TikTok username: Galendereall
// Twitch username: Galendereal

const http = require("http");
const fs = require("fs");
const path = require("path");
const { TikTokLiveConnection, WebcastEvent } = require("tiktok-live-connector");

const PORT = process.env.PORT || 3000;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

let twitchToken = null;
let twitchTokenExpires = 0;
let twitchData = {live:false, viewers:0};
let tiktokData = {live:false, viewers:0};

async function getTwitchToken(){
  if(twitchToken && Date.now() < twitchTokenExpires) return twitchToken;
  if(!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET)
    throw new Error("Missing Twitch credentials");

  const body = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    client_secret: TWITCH_CLIENT_SECRET,
    grant_type: "client_credentials"
  });

  const r = await fetch("https://id.twitch.tv/oauth2/token",{
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body
  });
  if(!r.ok) throw new Error("Twitch auth failed");
  const j=await r.json();
  twitchToken=j.access_token;
  twitchTokenExpires=Date.now()+(j.expires_in-120)*1000;
  return twitchToken;
}

async function updateTwitch(){
  try{
    const token=await getTwitchToken();
    const r=await fetch(
      "https://api.twitch.tv/helix/streams?user_login=Galendereal",
      {headers:{
        "Client-Id":TWITCH_CLIENT_ID,
        "Authorization":"Bearer "+token
      }}
    );
    if(!r.ok) throw new Error("Twitch API "+r.status);
    const j=await r.json();
    const stream=j.data?.[0];
    twitchData=stream
      ? {live:true,viewers:Number(stream.viewer_count||0)}
      : {live:false,viewers:0};
  }catch(e){
    console.error("Twitch:",e.message);
    twitchData={live:false,viewers:0};
  }
}

// TikTok LIVE is not available through TikTok's official public API.
// This uses the open-source tiktok-live-connector to receive public
// LIVE room events, including RoomUserSeqEvent viewer counts.
const tt = new TikTokLiveConnection("Galendereall");

async function connectTikTok(){
  try{
    await tt.connect();
    console.log("TikTok connected");
  }catch(e){
    console.error("TikTok connection:",e.message);
    tiktokData={live:false,viewers:0};
    setTimeout(connectTikTok,10000);
  }
}

tt.on(WebcastEvent.ROOM_USER, data=>{
  const viewers =
    Number(data?.viewerCount ??
    data?.totalUserCount ??
    data?.userCount ??
    data?.roomUserCount ?? 0);
  tiktokData={live:true,viewers};
});

tt.on(WebcastEvent.LIVE_END,()=>{
  tiktokData={live:false,viewers:0};
});

tt.on("disconnected",()=>{
  tiktokData={live:false,viewers:0};
});

connectTikTok();

setInterval(updateTwitch,5000);
updateTwitch();

const server=http.createServer((req,res)=>{
  res.setHeader("Access-Control-Allow-Origin","*");

  if(req.url==="/api/viewers"){
    res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
    res.end(JSON.stringify({
      tiktok:tiktokData,
      twitch:twitchData
    }));
    return;
  }

  if(req.url==="/" || req.url==="/index.html"){
    res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});
    res.end(fs.readFileSync(path.join(__dirname,"index.html")));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT,()=>console.log("Tracker: http://localhost:"+PORT));