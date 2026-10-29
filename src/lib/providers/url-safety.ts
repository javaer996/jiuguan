import type { LookupAddress } from "node:dns";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { ApiError } from "@/lib/api";
import { getEnv } from "@/lib/env";

/**
 * 供应商地址默认只允许公网 http(s)。
 * 自托管 Ollama / vLLM 等需要访问本机或内网时，
 * 显式设置 ALLOW_PRIVATE_PROVIDER_URLS=true。
 */
const blocked = new BlockList();

for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(network, prefix, "ipv4");
}

for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["2001:db8::", 32],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["2002::", 16],
] as const) {
  blocked.addSubnet(network, prefix, "ipv6");
}

function isBlockedAddress(address: string) {
  const family = isIP(address);
  if (family === 0) return true;
  return blocked.check(address, family === 4 ? "ipv4" : "ipv6");
}

function unsafe(message: string) {
  return new ApiError(
    400,
    "UNSAFE_PROVIDER_URL",
    `${message}。如确实需要访问本机或内网模型，请设置 ALLOW_PRIVATE_PROVIDER_URLS=true`,
  );
}

export async function assertSafeProviderUrl(
  input: string,
  options: { resolveDns?: boolean } = {},
) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new ApiError(400, "INVALID_PROVIDER_URL", "API 地址不是合法的 URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ApiError(400, "INVALID_PROVIDER_URL", "API 地址只支持 http(s)");
  }
  if (url.username || url.password) {
    throw new ApiError(
      400,
      "INVALID_PROVIDER_URL",
      "API 地址不能包含用户名或密码",
    );
  }

  if (getEnv().ALLOW_PRIVATE_PROVIDER_URLS) return;

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname) {
    throw new ApiError(400, "INVALID_PROVIDER_URL", "API 地址缺少主机名");
  }

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw unsafe("API 地址不能指向本机或局域网");
  }

  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      throw unsafe("API 地址不能指向内网、回环或保留地址");
    }
    return;
  }

  if (!options.resolveDns) return;

  let addresses: LookupAddress[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new ApiError(
      400,
      "PROVIDER_DNS_FAILED",
      "无法解析 API 地址的域名，请检查地址是否正确",
    );
  }

  if (addresses.length === 0) {
    throw new ApiError(
      400,
      "PROVIDER_DNS_FAILED",
      "API 地址没有解析到任何 IP",
    );
  }

  if (addresses.some((item) => isBlockedAddress(item.address))) {
    throw unsafe("API 地址解析到了内网、回环或保留地址");
  }
}
