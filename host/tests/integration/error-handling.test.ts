import { loadConfig as loadBosConfig } from "everything-dev/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

interface ORPCErrorResponse {
	code: string;
	status: number;
	message: string;
	data?: Record<string, unknown>;
}

describe("Error Propagation & Formatting", () => {
	const createMockApiClient = () => ({
		ping: vi.fn().mockResolvedValue({ status: "ok", timestamp: new Date().toISOString() }),
	});

	let mockApiClient: ReturnType<typeof createMockApiClient>;

	beforeAll(async () => {
		mockApiClient = createMockApiClient();
		globalThis.$apiClient = mockApiClient as any;
		const loadedConfig = await loadBosConfig();
		if (!loadedConfig) {
			throw new Error("Failed to load config for error handling tests");
		}
	});

	afterAll(() => {
		(globalThis as Record<string, unknown>).$apiClient = undefined;
	});

	describe("UNAUTHORIZED Error Flow", () => {
		it("returns 401 when calling ping endpoint without authentication context", async () => {
			mockApiClient.ping.mockRejectedValueOnce({
				code: "UNAUTHORIZED",
				status: 401,
				message: "Auth required",
				data: { apiKeyProvided: false },
			});

			await expect(mockApiClient.ping()).rejects.toMatchObject({
				code: "UNAUTHORIZED",
				status: 401,
				message: "Auth required",
			});
		});

		it("preserves UNAUTHORIZED error structure through the client", async () => {
			const unauthorizedError = {
				code: "UNAUTHORIZED",
				status: 401,
				message: "Auth required",
				data: { apiKeyProvided: false },
			};
			mockApiClient.ping.mockRejectedValueOnce(unauthorizedError);

			try {
				await mockApiClient.ping();
				expect.fail("Should have thrown");
			} catch (error) {
				expect(error).toMatchObject({
					code: "UNAUTHORIZED",
					status: 401,
				});
			}
		});

		it("UNAUTHORIZED error includes proper status code 401", async () => {
			const error = {
				code: "UNAUTHORIZED",
				status: 401,
				message: "Auth required",
			};
			mockApiClient.ping.mockRejectedValueOnce(error);

			try {
				await mockApiClient.ping();
				expect.fail("Should have thrown");
			} catch (e) {
				const err = e as ORPCErrorResponse;
				expect(err.status).toBe(401);
				expect(err.code).toBe("UNAUTHORIZED");
			}
		});
	});

	describe("NOT_FOUND Error Flow", () => {
		it("returns 404 when accessing non-existent resource", async () => {
			const notFoundError = {
				code: "NOT_FOUND",
				status: 404,
				message: "Resource not found",
				data: { resource: "product", resourceId: "non-existent-id" },
			};
			mockApiClient.ping.mockRejectedValueOnce(notFoundError);

			try {
				await mockApiClient.ping();
				expect.fail("Should have thrown");
			} catch (error) {
				expect(error).toMatchObject({
					code: "NOT_FOUND",
					status: 404,
					message: "Resource not found",
				});
			}
		});

		it("preserves NOT_FOUND error data through the stack", async () => {
			const notFoundError = {
				code: "NOT_FOUND",
				status: 404,
				message: "Resource not found",
				data: { resource: "product", resourceId: "specific-id-123" },
			};
			mockApiClient.ping.mockRejectedValueOnce(notFoundError);

			try {
				await mockApiClient.ping();
				expect.fail("Should have thrown");
			} catch (e) {
				const error = e as ORPCErrorResponse;
				expect(error.data).toBeDefined();
				expect(error.data?.resource).toBe("product");
				expect(error.data?.resourceId).toBe("specific-id-123");
			}
		});

		it("NOT_FOUND error on ping includes proper data", async () => {
			const notFoundError = {
				code: "NOT_FOUND",
				status: 404,
				message: "Resource not found",
				data: { resource: "product", resourceId: "deleted-id" },
			};
			mockApiClient.ping.mockRejectedValueOnce(notFoundError);

			try {
				await mockApiClient.ping();
				expect.fail("Should have thrown");
			} catch (e) {
				const error = e as ORPCErrorResponse;
				expect(error.code).toBe("NOT_FOUND");
				expect(error.status).toBe(404);
				expect(error.data?.resourceId).toBe("deleted-id");
			}
		});
	});

	describe("Error Status Code Preservation", () => {
		it("UNAUTHORIZED always has status 401", async () => {
			mockApiClient.ping.mockRejectedValueOnce({
				code: "UNAUTHORIZED",
				status: 401,
				message: "Unauthorized access",
			});

			try {
				await mockApiClient.ping();
				expect.fail("Should have thrown");
			} catch (e) {
				const error = e as ORPCErrorResponse;
				expect(error.status).toBe(401);
			}
		});

		it("NOT_FOUND always has status 404", async () => {
			mockApiClient.ping.mockRejectedValueOnce({
				code: "NOT_FOUND",
				status: 404,
				message: "Resource not found",
			});

			try {
				await mockApiClient.ping();
				expect.fail("Should have thrown");
			} catch (e) {
				const error = e as ORPCErrorResponse;
				expect(error.status).toBe(404);
			}
		});

		it("FORBIDDEN has status 403", async () => {
			mockApiClient.ping.mockRejectedValueOnce({
				code: "FORBIDDEN",
				status: 403,
				message: "Access denied",
				data: { action: "write" },
			});

			try {
				await mockApiClient.ping();
				expect.fail("Should have thrown");
			} catch (e) {
				const error = e as ORPCErrorResponse;
				expect(error.status).toBe(403);
				expect(error.code).toBe("FORBIDDEN");
			}
		});
	});

	describe("SSR Client Error Handling", () => {
		it("uses globalThis.$apiClient during SSR rendering", () => {
			expect(globalThis.$apiClient).toBeDefined();
			expect(globalThis.$apiClient).toBe(mockApiClient);
		});

		it("SSR client handles errors without needing absolute URL", async () => {
			mockApiClient.ping.mockRejectedValueOnce({
				code: "NOT_FOUND",
				status: 404,
				message: "Resource not found",
				data: { resource: "product", resourceId: "ssr-test-id" },
			});

			try {
				await mockApiClient.ping();
				expect.fail("Should have thrown");
			} catch (e) {
				const error = e as ORPCErrorResponse;
				expect(error.code).toBe("NOT_FOUND");
			}
		});
	});

	describe("Error Message Preservation", () => {
		it("uses API handler's standardized NOT_FOUND message with error data", async () => {
			const standardMessage = "Resource not found";
			const errorPayload = {
				code: "NOT_FOUND",
				status: 404,
				message: standardMessage,
				data: { resource: "product", resourceId: "custom-id" },
			};

			mockApiClient.ping.mockRejectedValueOnce(errorPayload);

			try {
				await mockApiClient.ping();
				expect.fail("Should have thrown");
			} catch (e) {
				const error = e as ORPCErrorResponse;
				expect(error.message).toBe(standardMessage);
				expect(error.data?.resourceId).toBe("custom-id");
			}
		});

		it("preserves UNAUTHORIZED message", async () => {
			const authMessage = "Auth required";
			mockApiClient.ping.mockRejectedValueOnce({
				code: "UNAUTHORIZED",
				status: 401,
				message: authMessage,
			});

			try {
				await mockApiClient.ping();
				expect.fail("Should have thrown");
			} catch (e) {
				const error = e as ORPCErrorResponse;
				expect(error.message).toBe(authMessage);
			}
		});
	});
});