/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APIService } from "./api.service";

/**
 * The web application redirects an expired session to the sign-in screen.
 * That behaviour now lives in `@strata/services` as an injected hook, so
 * these tests guard the wiring: the hook must fire on 401, and the entry
 * page must be left alone (redirecting it loops forever).
 */

const requestMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

// Capture the response interceptor axios was handed, so the test can feed it
// a 401 and observe what the service does.
let responseErrorHandler: ((error: unknown) => Promise<never>) | undefined;

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  return {
    ...actual,
    create: () => ({
      get: requestMocks.get,
      post: requestMocks.post,
      put: requestMocks.put,
      patch: requestMocks.patch,
      delete: requestMocks.delete,
      request: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: {
          use: (_ok: unknown, error: (e: unknown) => Promise<never>) => {
            responseErrorHandler = error;
          },
        },
      },
    }),
  };
});

const location = { pathname: "/", replace: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  responseErrorHandler = undefined;
  vi.stubGlobal("window", { location });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

class TestService extends APIService {
  constructor() {
    super("https://api.strata.so");
  }
}

describe("APIService unauthorized handling", () => {
  it("redirects to the sign-in screen when the API answers 401", async () => {
    location.pathname = "/acme/projects/";
    const service = new TestService();
    void service;

    expect(responseErrorHandler).toBeDefined();
    await expect(responseErrorHandler!({ response: { status: 401 } })).rejects.toBeDefined();

    expect(location.replace).toHaveBeenCalledWith("/?next_path=%2Facme%2Fprojects%2F");
  });

  it("leaves the entry page alone so the sign-in screen can render", async () => {
    location.pathname = "/";
    const service = new TestService();
    void service;

    await expect(responseErrorHandler!({ response: { status: 401 } })).rejects.toBeDefined();

    expect(location.replace).not.toHaveBeenCalled();
  });

  it("does not redirect for other error statuses", async () => {
    location.pathname = "/acme/projects/";
    const service = new TestService();
    void service;

    await expect(responseErrorHandler!({ response: { status: 403 } })).rejects.toBeDefined();

    expect(location.replace).not.toHaveBeenCalled();
  });
});
