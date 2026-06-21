export const SUI_RPC =
  process.env.NEXT_PUBLIC_SUI_RPC ?? "https://fullnode.testnet.sui.io:443";

export const OPENMIND_PACKAGE =
  process.env.NEXT_PUBLIC_OPENMIND_PACKAGE ??
  "0x3538ab0c8317477f23d1c53603a2d402bccf2f53fee8e52f9af1670bc6f3c17a";

export const VAULT_OBJECT =
  process.env.NEXT_PUBLIC_VAULT_OBJECT ??
  "0x5c7f075330ca60e6b3d68354baea80a624da25a6dbc771537994a00be9ca3f08";

export const AGENT_CAP_OBJECT =
  process.env.NEXT_PUBLIC_AGENT_CAP_OBJECT ??
  "0x637d19f22591a949f52abec8eb9142aab697d6ab930ef3b41154af00c3b0fe7b";

export const OWNER_CAP_OBJECT =
  process.env.NEXT_PUBLIC_OWNER_CAP_OBJECT ??
  "0xca60648d44aaecb2e60c44fbea26bad25384df01044b8c76537af61997440acd";

export const DUSDC_TYPE =
  process.env.NEXT_PUBLIC_DUSDC_TYPE ??
  "0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC";

export const VAULT_SHARE_TYPE = `${OPENMIND_PACKAGE}::openmind_vault::OPENMIND_VAULT`;

export const CLOCK_OBJECT = "0x6";

export const WALRUS_AGGREGATOR =
  process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR ??
  "https://aggregator.walrus-testnet.walrus.space";

export const SUI_EXPLORER_TX = (digest: string) =>
  `https://suiscan.xyz/testnet/tx/${digest}`;
