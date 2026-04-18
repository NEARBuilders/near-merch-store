import { describe, expect, it, vi } from "vitest";
import {
	installSsrApiClientGlobal,
	runWithSsrApiClient,
} from "@/services/ssr-api-client";

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

describe("SSR apiClient injection", () => {
	it("uses AsyncLocalStorage store over global override", async () => {
		installSsrApiClientGlobal();

		const baseClient = {
			ping: vi.fn().mockResolvedValue({ status: "ok", timestamp: "base" }),
		};
		const scopedClient = {
			ping: vi.fn().mockResolvedValue({ status: "ok", timestamp: "scoped" }),
		};

		(globalThis as any).$apiClient = baseClient;
		expect((globalThis as any).$apiClient).toBe(baseClient);

		const result = await runWithSsrApiClient(scopedClient, async () => {
			await new Promise((r) => setTimeout(r, 0));
			return (globalThis as any).$apiClient.ping();
		});

		expect(result).toEqual({ status: "ok", timestamp: "scoped" });
		expect(scopedClient.ping).toHaveBeenCalled();
		expect(baseClient.ping).not.toHaveBeenCalled();
	});

	it("does not leak across concurrent runs", async () => {
		installSsrApiClientGlobal();
		const baseClient = {
			ping: vi.fn().mockResolvedValue({ status: "ok", timestamp: "base" }),
		};
		const clientA = {
			ping: vi.fn().mockResolvedValue({ status: "ok", timestamp: "A" }),
		};
		const clientB = {
			ping: vi.fn().mockResolvedValue({ status: "ok", timestamp: "B" }),
		};
		(globalThis as any).$apiClient = baseClient;

		const p1 = runWithSsrApiClient(clientA, async () => {
			await new Promise((r) => setTimeout(r, 10));
			return (globalThis as any).$apiClient.ping();
		});

		const p2 = runWithSsrApiClient(clientB, async () => {
			await new Promise((r) => setTimeout(r, 0));
			return (globalThis as any).$apiClient.ping();
		});

		const [r1, r2] = await Promise.all([p1, p2]);
		expect(r1).toEqual({ status: "ok", timestamp: "A" });
		expect(r2).toEqual({ status: "ok", timestamp: "B" });
		expect((globalThis as any).$apiClient).toBe(baseClient);

		expect(clientA.ping).toHaveBeenCalled();
		expect(clientB.ping).toHaveBeenCalled();
		expect(baseClient.ping).not.toHaveBeenCalled();
	});
});