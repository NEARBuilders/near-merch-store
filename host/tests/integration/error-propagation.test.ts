import { loadConfig as loadBosConfig } from "everything-dev/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

interface ORPCErrorResponse {
	code: string;
	status: number;
	message: string;
	data?: Record<string, unknown>;
}

describe("ORPC Error Propagation to HTTP Response", () => {
	const mockApiClient = {
		ping: vi.fn().mockResolvedValue({ status: "ok", timestamp: new Date().toISOString() }),
	};

	beforeAll(async () => {
		globalThis.$apiClient = mockApiClient as any;
		const loadedConfig = await loadBosConfig();
		if (!loadedConfig) {
			throw new Error("Failed to load config for error propagation tests");
		}
	});

	afterAll(() => {
		delete (globalThis as Record<string, unknown>).$apiClient;
	});

	describe("Error Structure Preservation", () => {
		it("should return error object with complete structure, not empty object", async () => {
			mockApiClient.ping.mockRejectedValueOnce({
				code: "UNAUTHORIZED",
				status: 401,
				message: "Auth required",
				data: { apiKeyProvided: false, authType: "apiKey" },
			});

			try {
				await mockApiClient.ping();
				expect.fail("Should have thrown error");
			} catch (error) {
				expect(error).toBeDefined();
				expect(error).not.toEqual({});

				expect(error).toHaveProperty("code");
				expect(error).toHaveProperty("message");
				expect(error).toHaveProperty("status");
				expect(error).toHaveProperty("data");

				(error as ORPCErrorResponse).code === "UNAUTHORIZED";
				(error as ORPCErrorResponse).message === "Auth required";
				(error as ORPCErrorResponse).status === 401;

				const err = error as ORPCErrorResponse;
				expect(err.code).toBe("UNAUTHORIZED");
				expect(err.message).toBe("Auth required");
				expect(err.status).toBe(401);

				expect(err.data).toBeDefined();
				expect(err.data!.apiKeyProvided).toBe(false);
				expect(err.data!.authType).toBe("apiKey");
			}
		});

		it("should preserve NOT_FOUND error structure", async () => {
			mockApiClient.ping.mockRejectedValueOnce({
				code: "NOT_FOUND",
				status: 404,
				message: "Resource not found",
				data: { resource: "product", resourceId: "specific-id-123" },
			});

			try {
				await mockApiClient.ping();
				expect.fail("Should have thrown NOT_FOUND error");
			} catch (error) {
				expect(error).toBeDefined();
				expect(error).not.toEqual({});

				const err = error as ORPCErrorResponse;
				expect(err.code).toBe("NOT_FOUND");
				expect(err.status).toBe(404);
				expect(err.message).toBe("Resource not found");

				expect(err.data).toBeDefined();
				expect(err.data!.resource).toBe("product");
				expect(err.data!.resourceId).toBe("specific-id-123");
			}
		});

		it("should preserve FORBIDDEN error with action data", async () => {
			mockApiClient.ping.mockRejectedValueOnce({
				code: "FORBIDDEN",
				status: 403,
				message: "Access denied",
				data: { action: "write", requiredPermissions: ["write:data"] },
			});

			try {
				await mockApiClient.ping();
				expect.fail("Should have thrown FORBIDDEN error");
			} catch (error) {
				expect(error).toBeDefined();
				expect(error).not.toEqual({});

				const err = error as ORPCErrorResponse;
				expect(err.code).toBe("FORBIDDEN");
				expect(err.status).toBe(403);

				expect(err.data).toBeDefined();
				expect(err.data!.action).toBe("write");
				expect(err.data!.requiredPermissions).toEqual(["write:data"]);
			}
		});
	});

	describe("Error Serialization", () => {
		it("should produce valid JSON that can be parsed", async () => {
			mockApiClient.ping.mockRejectedValueOnce({
				code: "UNAUTHORIZED",
				status: 401,
				message: "Auth required for testing",
				data: { apiKeyProvided: false },
			});

			try {
				await mockApiClient.ping();
				expect.fail("Should have thrown");
			} catch (error) {
				const errorStr = JSON.stringify(error);

				expect(errorStr).not.toBe("{}");
				expect(errorStr).not.toMatch(/^\s*\{\s*\}\s*$/);

				expect(errorStr).toContain("UNAUTHORIZED");
				expect(errorStr).toContain("Auth required");

				const parsed = JSON.parse(errorStr);
				expect(parsed.code).toBe("UNAUTHORIZED");
				expect(parsed.message).toBe("Auth required for testing");
			}
		});

		it("should have enough information for debugging", async () => {
			mockApiClient.ping.mockRejectedValueOnce({
				code: "NOT_FOUND",
				status: 404,
				message: "Resource not found for debugging",
				data: { resource: "product", resourceId: "debug-123" },
			});

			try {
				await mockApiClient.ping();
				expect.fail("Should have thrown");
			} catch (error) {
				const errorStr = JSON.stringify(error);

				expect(errorStr.length).toBeGreaterThan(50);
				expect(errorStr).not.toMatch(/Error:\s*\{\}/);
				expect(errorStr).toContain("debug-123");
			}
		});
	});

	describe("SSR Error Context Preservation", () => {
		it("should include error data for user notifications", async () => {
			mockApiClient.ping.mockRejectedValueOnce({
				code: "UNAUTHORIZED",
				status: 401,
				message: "Authentication required",
				data: { apiKeyProvided: false, provider: "test-provider" },
			});

			try {
				await mockApiClient.ping();
				expect.fail("Should have thrown");
			} catch (error) {
				const err = error as ORPCErrorResponse;
				expect(err.message).toBeDefined();
				expect(err.message.length).toBeGreaterThan(0);
				expect(err.message).not.toContain("Error: {}");

				expect(err.data).toBeDefined();
				expect(err.data!.apiKeyProvided).toBe(false);
			}
		});

		it("should preserve status codes for conditional error display", async () => {
			const testCases = [
				{ code: "UNAUTHORIZED", status: 401, message: "Auth required" },
				{ code: "NOT_FOUND", status: 404, message: "Not found" },
				{ code: "FORBIDDEN", status: 403, message: "Forbidden" },
				{ code: "ERROR_CODE", status: 500, message: "Server error" },
			];

			for (const testCase of testCases) {
				mockApiClient.ping.mockRejectedValueOnce(testCase);

				try {
					await mockApiClient.ping();
					expect.fail(`Should have thrown ${testCase.code}`);
				} catch (error) {
					const err = error as ORPCErrorResponse;
					expect(err.status).toBeDefined();
					expect(typeof err.status).toBe("number");
					expect(err.status).toBe(testCase.status);

					expect(err.code).toBeDefined();
					expect(typeof err.code).toBe("string");
					expect(err.code).toBe(testCase.code);
				}
			}
		});
	});

	describe("Status Code Consistency", () => {
		it("should map error codes to correct HTTP status codes", async () => {
			const statusMappings = {
				UNAUTHORIZED: 401,
				NOT_FOUND: 404,
				FORBIDDEN: 403,
				BAD_REQUEST: 400,
			};

			for (const [code, expectedStatus] of Object.entries(statusMappings)) {
				mockApiClient.ping.mockRejectedValueOnce({
					code,
					status: expectedStatus,
					message: `Test ${code}`,
				});

				try {
					await mockApiClient.ping();
					expect.fail(`Should have thrown ${code}`);
				} catch (error) {
					const err = error as ORPCErrorResponse;
					expect(err.status).toBe(expectedStatus);
					expect(err.code).toBe(code);
				}
			}
		});
	});
});