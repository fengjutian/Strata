/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIService as SharedAPIService } from "@strata/services";

/**
 * The web application's HTTP base class.
 *
 * The request/response plumbing lives in `@strata/services` so that every
 * application shares one implementation. The only web-specific behaviour is
 * what to do when the session expires, which is injected as a hook.
 */
export abstract class APIService extends SharedAPIService {
  constructor(baseURL: string) {
    super(baseURL, redirectToSignInOnUnauthorized);
  }
}

/**
 * Send the browser to the sign-in screen when the API reports an expired
 * session.
 *
 * The entry page ("/") runs its own current-user request on mount; when the
 * session is expired that request 401s too, and redirecting "/" to
 * "/?next_path=/" reloads the page in an endless loop instead of letting the
 * sign-in screen render. Only bounce away from private routes.
 */
function redirectToSignInOnUnauthorized(): void {
  const currentPath = window.location.pathname;
  if (currentPath === "/") return;
  window.location.replace(`/${currentPath ? `?next_path=${encodeURIComponent(currentPath)}` : ``}`);
}
