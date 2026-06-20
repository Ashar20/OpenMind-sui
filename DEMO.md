# Demo story (for judges)

1. **Deposit** dUSDC into the vault on `/vault` → receive omDUSDC shares.
2. **Run a cycle live** — on `/brain`, click "Run cycle." Watch it happen in real time: closes the previous settled cycle, runs the AI agent (news → GraphRAG → MemWal recall → budget scoring), anchors the reasoning hash on Sui *before* opening, then opens the next hedge — gated by `agent_cap`'s on-chain budget/expiry check. Tx links appear as each step lands.
3. **Inspect the reasoning** — same page, click any past cycle to see its knowledge graph, evidence, and Walrus blob.
4. **Verify the proof** — `/proof` re-fetches the Walrus blob for any anchor and confirms it's readable; the hash committed on-chain predates the oracle's settlement.
5. **Revoke the agent** — on `/wallet`, see the live AgentCap (budget spent, action count, expiry), and click revoke with the owner's connected wallet. Every subsequent autonomous action reverts on-chain with `ERevoked` — instant, provable, not a backend flag.
6. **Verify at scale** — `npm run verify:judge` replays ~950 historical settled BTC oracles, comparing fixed 250bps vs dynamic AI budget across 3 PLP carry bands.

The vault does not promise returns. The hedge is sized per-cycle by an agent that learns from its own history, and its authority to act is capped and revocable on-chain.

---

## How we meet the minimum requirements (what to say to judges)

**What openmind is:** a **vault strategy** — an adaptive carry vault on DeepBook Predict — *and* it ships as a full working product. So we cover the vault-strategy bar (simulation) and the product bar (end-to-end flow) at the same time.

| Requirement | How we meet it | Where to point |
|---|---|---|
| **Integrate DeepBook Predict contract on testnet** | Every cycle, the vault's `open_cycle_authorized` / `close_cycle_authorized` Move functions call into the DeepBook Predict market (`PREDICT_SHARED`) on testnet to open and settle the hedge against live BTC oracles. | The open/close tx links in Shot 2 → click through to Suiscan; `PREDICT_PACKAGE` / `PREDICT_SHARED` in `deploy/testnet.env` |
| **Work end to end** (product flow) | Deposit dUSDC → receive omDUSDC → agent runs a live cycle (recall → reason → anchor → open on Predict) → oracle settles → close → MemWal remember. All on testnet, triggered from the UI. | Shots 1–4, live |
| **Proper simulation result** (vault strategy) | `npm run verify:judge` replays **~950 historical settled BTC oracles**, comparing a fixed 250bps hedge vs the dynamic AI-scored budget across **3 PLP carry bands** — showing the adaptive policy's effect at scale, not just one cycle. | Shot 6, terminal |

**One-line answer to "product or vault strategy?":**
> "It's a vault strategy — an adaptive DeepBook Predict carry vault — so the requirement that binds us is the simulation, which we have: ~950 historical oracles, fixed vs dynamic budget. But we also built the full product, so you can test the entire deposit → cycle → settle flow live on testnet."

**Talking points to say out loud (30s):**
- *"DeepBook Predict isn't a sidecar — it's the core venue. The vault opens and settles every hedge directly against the Predict market on-chain. The open/close tx you just saw are real Predict interactions."*
- *"As a vault strategy, our claim is the sizing policy. The simulation backs it: across ~950 settled BTC oracles and three carry bands, the dynamic AI budget behaves differently from a static 250bps hedge — that's the result, reproducible with one command."*
- *"And because it's also a working product, you don't have to take the sim on faith — deposit, run a cycle, watch it settle, all live."*
