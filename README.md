# companion.

A fan-made anime character chat and study workspace hosted on GitHub Pages.

## Features
- Character picker, favorites, and separate local chat histories
- AI character chat through a separately deployed Cloudflare Worker
- Study tools and AI-generated animated lesson storyboards
- Browser-based read-aloud and voice input
- Dark and light themes

## Free AI setup
Follow [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) to deploy the included `worker.js` backend and connect it in the site's **About & privacy** panel.

Keep the Worker on Cloudflare's Free plan. The free AI quota is shared and daily; when it is exhausted, AI requests pause until it resets. The lesson creator makes animated, narrated slides in the browser, not cinematic footage or downloadable MP4 videos.

The website uses local browser storage for chats and preferences. There is no account system or cloud chat sync.
