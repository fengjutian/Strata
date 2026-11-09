/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// strata constants
import type { TAdminAuthErrorInfo } from "@strata/constants";
import { Banner } from "@makestrata/propel/components/banner";

type TAuthBanner = {
  bannerData: TAdminAuthErrorInfo | undefined;
  handleBannerData?: (bannerData: TAdminAuthErrorInfo | undefined) => void;
};

export function AuthBanner(props: TAuthBanner) {
  const { bannerData, handleBannerData } = props;

  if (!bannerData) return <></>;
  return (
    <Banner
      placement="inline"
      variant="info"
      description={<>{bannerData.message}</>}
      dismissLabel="Dismiss banner"
      onDismiss={() => handleBannerData && handleBannerData(undefined)}
    />
  );
}
