# GALENDEREAL Transparent Tracker

Vienas paprastas transparent widgetas OBS Browser Source'ui.

- TikTok: `@Galendereall` — automatinis LIVE/offline + viewer count.
- Twitch: `Galendereal` — automatinis LIVE/offline + viewer count.
- Total viewers.
- Transparent background.
- Nėra gradientų.
- Atnaujinama kas 5 sekundes.
- Kai platforma offline, rodoma `OFFLINE` ir viewer count = 0.

## Paleidimas

Reikia Node.js 18+.

```bash
npm install
```

Twitch API credentials:
- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`

Windows PowerShell:
```powershell
$env:TWITCH_CLIENT_ID="YOUR_CLIENT_ID"
$env:TWITCH_CLIENT_SECRET="YOUR_CLIENT_SECRET"
node server.js
```

Tada OBS:
Browser Source → URL:
`http://localhost:3000`

Rekomenduojamas plotis: 430
Rekomenduojamas aukštis: 115

Svarbu:
TikTok neturi oficialaus viešo LIVE viewer-count API. Šis variantas naudoja
` tiktok-live-connector `, kuris jungiasi prie viešo TikTok LIVE Webcast srauto.
Tai yra neoficialus sprendimas ir gali nustoti veikti, jei TikTok pakeis savo
Webcast protokolą.
