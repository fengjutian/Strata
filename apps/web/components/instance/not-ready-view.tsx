/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { GOD_MODE_URL } from "@strata/constants";
import DefaultLayout from "@/layouts/default-layout";
import { StrataLockup, StrataLogo } from "@strata/blocks/icons";
import { Button } from "@makestrata/propel/components/button";

export function InstanceNotReady() {
  return (
    <DefaultLayout>
      <div className="relative z-10 flex h-screen w-screen overflow-hidden">
        {/* Background decorations */}
        <StrataLogo
          className="pointer-events-none absolute -top-24 -left-32 h-56 w-auto opacity-10"
          aria-hidden="true"
        />
        <StrataLogo
          className="pointer-events-none absolute -right-20 -bottom-16 h-56 w-auto opacity-10"
          aria-hidden="true"
        />
        {/* Main content */}
        <div className="flex h-full w-full flex-col items-center px-8 pt-6 pb-10">
          <div className="sticky top-0 flex w-full shrink-0 items-center justify-between gap-6">
            <StrataLockup height={20} width={95} className="text-primary" />
          </div>
          <div className="flex h-full w-full flex-col items-center justify-center gap-7">
            <div className="flex flex-col items-center gap-11">
              <StrataLogo className="h-24 w-auto" />
              <div className="flex max-w-124 flex-col items-center gap-3">
                <h1 className="text-h2-semibold text-primary">Welcome to Strata</h1>
                <p className="text-center text-body-md-regular text-secondary">
                  Set up your instance and create your first workspace to begin managing projects and work.
                </p>
              </div>
            </div>
            <div className="w-72">
              <Button
                variant="primary"
                size="lg"
                stretch="full"
                nativeButton={false}
                render={<a href={GOD_MODE_URL}>Get started</a>}
                label="Get started"
              />
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}
