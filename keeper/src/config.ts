// All on-chain anchors — single source of truth.
// DeepBook Predict package IDs from:
// https://docs.sui.io/onchain-finance/deepbook-predict/contract-information

export const NETWORK = "testnet" as const;
export const SUI_RPC = "https://fullnode.testnet.sui.io:443";

// DeepBook Predict
export const PREDICT_PACKAGE =
  "0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138";
export const PREDICT_SHARED =
  "0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a";
export const DUSDC_TYPE =
  "0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC";
export const PLP_TYPE =
  `${PREDICT_PACKAGE}::plp::PLP`;

// Predict server (indexed data)
// Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information
export const PREDICT_SERVER =
  "https://predict-server.testnet.mystenlabs.com";

export const CLOCK_OBJECT = "0x6";

// Walrus
// Reference: https://docs.wal.app/docs/system-overview/public-aggregators-and-publishers
export const WALRUS_PUBLISHER =
  process.env.WALRUS_PUBLISHER ?? "https://publisher.walrus-testnet.walrus.space";
export const WALRUS_AGGREGATOR =
  process.env.WALRUS_AGGREGATOR ?? "https://aggregator.walrus-testnet.walrus.space";

// openmind vault
export const OPENMIND_PACKAGE =
  process.env.OPENMIND_PACKAGE ??
  "0x3538ab0c8317477f23d1c53603a2d402bccf2f53fee8e52f9af1670bc6f3c17a";
export const VAULT_OBJECT =
  process.env.VAULT_OBJECT ??
  "0x5c7f075330ca60e6b3d68354baea80a624da25a6dbc771537994a00be9ca3f08";
export const VAULT_MANAGER =
  process.env.VAULT_MANAGER ??
  "0xf9fa0be99710a6e0fe9510d72cf77dd68a508e8eaed65cfd22e825716a9ff551";
export const ACCESS_CONTROL_OBJECT =
  process.env.ACCESS_CONTROL_OBJECT ??
  "0x472a2b32296283930952664a2aac9429422c1cca11c0bffe6d02c816ae1afa62";
export const AGENT_CAP_OBJECT =
  process.env.AGENT_CAP_OBJECT ??
  "0x637d19f22591a949f52abec8eb9142aab697d6ab930ef3b41154af00c3b0fe7b";
export const OWNER_CAP_OBJECT =
  process.env.OWNER_CAP_OBJECT ??
  "0xca60648d44aaecb2e60c44fbea26bad25384df01044b8c76537af61997440acd";
