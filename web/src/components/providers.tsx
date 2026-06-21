"use client";

import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SUI_RPC } from "@/lib/sui-config";
import "@mysten/dapp-kit/dist/index.css";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={{ testnet: { url: SUI_RPC, network: "testnet" } }}
        defaultNetwork="testnet"
      >
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
