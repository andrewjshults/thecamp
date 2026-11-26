# NPC chat on PubNub Functions

`npc-function.js` is a PubNub Function that lets NPCs answer with Claude
when the game is hosted statically (GitHub Pages). You don't need another
server, and the Anthropic API key never reaches the browser.

- **Model:** `claude-haiku-5-5` with thinking off, `effort: low` and
  `max_tokens: 100`. Only the player's latest line is sent, with no
  conversation history.
- **What the browser sends:** ids and that one line (`npcId`, `here`, `pid`,
  `playerName`, `sidekick`, `message`). The Function holds each NPC's
  personality and the talking rules, so it can't be used as a general LLM
  proxy.
- **Item questions** ("where is the sword?") are answered in the browser by
  keyword matching and never reach the Function.
- **Spending caps** are tracked in the KV store as micro-dollars, using the
  token usage Claude reports for each reply:
  - **$3.00 per UTC day** for everyone together (`GLOBAL_DAILY_USD`)
  - **$0.25 per UTC hour** for each player id (`PLAYER_HOURLY_USD`)
- **Fallback:** if a cap is hit, the Function isn't set up, or anything fails,
  it returns `{ reply: null }` and the game uses its built-in
  `localNpcReply()` lines. After a "limit", "unconfigured" or network failure,
  the browser stops calling the Function for 5 minutes
  (`NPC_LIMIT_BACKOFF_MS`).

> The player id is a random value stored in the browser, so the per-player
> cap is soft: a new private window gets a fresh $0.25. The $3/day global
> cap holds regardless. **Also set a monthly spend limit on the Anthropic
> side** (Console → your workspace → Limits). That is the real backstop.

Cost: a reply costs roughly 600 input + 30 output tokens, about $0.000075, so
$3 is roughly 40,000 replies a day.

## Install

1. **Get an Anthropic API key.** In the Anthropic Console, create a workspace
   just for this game, set its monthly spend limit, and create an API key in
   it.
2. **Create the Function.** In the PubNub Admin Portal, open the keyset the
   game already uses (the one `PUBNUB_SUBSCRIBE_KEY` in `src/mp/mp.js` points
   to). Go to **Functions**, create a module, and add a function:
   - Event type: **On Request**
   - Path: e.g. `npc-reply`
3. **Store the key.** In the module's **My Secrets** (the Vault), add a secret
   named `ANTHROPIC_API_KEY` containing the key.
4. **Paste the code.** Copy all of `pubnub/npc-function.js` into the function
   editor, save, and **Start** the module. Use the editor's test panel to send
   a POST body like this:
   ```json
   { "pid": "p-test123", "npcId": "toilet_frog", "here": "assets/bathroom_stall_2.json",
     "playerName": "Red Scout", "message": "hi frog!" }
   ```
   You should get back `{"reply":"..."}`.
5. **Point the game at it.** Copy the function's URL (shown in the editor,
   like `https://ps.pndsn.com/v1/blocks/sub-key/<sub-key>/npc-reply`) into
   `NPC_FUNCTION_URL` in `src/people/talk.js` and deploy.

Leave `NPC_FUNCTION_URL` empty to skip the Function. The game then uses the
dev server's `/api/npc-reply` (`npm run dev` with `ANTHROPIC_API_KEY` set),
or the built-in replies.

## When NPCs or maps change

The Function has its own copy of every NPC (personality, `what`, character
`desc`) and every map's name and hotspot names. These are generated from
`assets/*.json` and the `characters` list in `src/people/characters.js`:

```bash
npm run build:npc
```

Then paste `pubnub/npc-function.js` into the PubNub editor again. Until you
do, a new NPC gets a 400 from the Function and falls back to built-in
replies.

## Things to check in the PubNub docs

These were written from memory of the PubNub Functions API, not checked
against the current docs:

- `kvstore.set(key, value, ttl)`: the TTL is assumed to be in **minutes**.
- `kvstore.getCounter` / `incrCounter`, `vault.get`, and `xhr.fetch`
  returning `{ status, body }`.
- The execution time limit. Haiku replies normally take 1–2 s; the browser
  gives up after 8 s.

If one of these behaves differently, fix it in `npc-function.js`. The logic
around the calls doesn't depend on them.

## Tuning

These constants are at the top of `npc-function.js`: `GLOBAL_DAILY_USD`,
`PLAYER_HOURLY_USD`, `MAX_TOKENS`, and the prices (`PRICE_IN_PER_MTOK`,
`PRICE_OUT_PER_MTOK`; update them if Haiku pricing changes). Before calling
Claude, the Function checks that a worst-case reply (`WORST_CASE_MICRO`)
still fits under both caps. After the reply it charges the real usage, so
requests arriving at the same moment can overshoot a cap by only a fraction
of a cent.
