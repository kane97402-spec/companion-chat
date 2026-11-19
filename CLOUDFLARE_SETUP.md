# companion. — Free AI setup

This repository includes a Cloudflare Worker backend in `worker.js`. The static website stays on GitHub Pages; the Worker keeps the AI binding on the server side.

## Important: keep it free

- Create and keep the Worker on Cloudflare's **Workers Free** plan.
- Do not upgrade to Workers Paid and do not enable paid billing.
- Workers AI currently includes 10,000 Neurons per day on the Free plan. If the daily allowance is used up, further model requests fail until the allowance resets. Check the current pricing page before relying on the limit: https://developers.cloudflare.com/workers-ai/platform/pricing/
- The website does not contain a Cloudflare API token. The Worker uses a Workers AI binding instead.
- This setup has basic per-IP request throttling, but it is a public website; the free daily quota is a hard ceiling, not a private-user quota. If the site becomes popular, other visitors may use some of the shared allowance.

## Deploy the Worker

1. Sign in to Cloudflare and open **Workers & Pages**.
2. Create a Worker named `companion-ai`.
3. Open its code editor and replace the starter code with the contents of this repository's `worker.js`. Save and deploy.
4. Open the Worker **Settings → Bindings**.
5. Add a **Workers AI** binding with the variable name exactly `AI`.
6. Save the binding and redeploy if Cloudflare asks.
7. Open the Worker URL and add `/health`. A successful setup returns JSON containing `"ok": true`.

The Worker uses the free-plan model `@cf/zai-org/glm-4.7-flash`. Cloudflare may change free model availability, so if this model is later restricted, select another model that Cloudflare explicitly lists as available on Workers Free.

## Connect companion.

1. Open https://kane97402-spec.github.io/companion-chat/
2. Open **About & privacy** in the left sidebar.
3. Paste your Worker URL (without `/health`) into **Cloudflare Worker URL**.
4. Click **Save AI connection**. The site checks the Worker's health endpoint before saving.
5. Start a character chat or open **Study center → Video** to generate an animated lesson.

The URL is saved only in this browser's local storage. It is not a secret. The AI binding remains on Cloudflare.

## What the video feature does

The free lesson creator asks the AI for a short storyboard, then presents it as animated slides with optional speech using the browser's built-in speech synthesis. It is an animated lesson/presentation, **not generated cinematic footage and not an MP4 export**. A hosted text model cannot create those video files without a separate video-generation service.

## Troubleshooting

- **403 / origin not allowed:** the Worker only allows the GitHub Pages origin above and local development at port 5500.
- **503 / binding not configured:** add the Workers AI binding named `AI`.
- **429 / too many requests:** wait at least one minute.
- **AI quota unavailable:** remain on Workers Free; wait for the daily reset. Do not upgrade if keeping the project completely free is required.
