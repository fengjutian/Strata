/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { AxiosRequestConfig } from "axios";
import axios from "axios";
import { API_BASE_URL } from "@strata/constants";
// services
import { APIService } from "@/services/api.service";

export class FileUploadService extends APIService {
  private cancelSource: any;

  constructor() {
    // Local-storage upload URLs are relative API paths. Using the API base keeps
    // them on Django in split-port development, while axios still leaves absolute
    // S3-compatible signed URLs on their original origin.
    super(API_BASE_URL);
  }

  async uploadFile(
    url: string,
    data: FormData,
    uploadProgressHandler?: AxiosRequestConfig["onUploadProgress"]
  ): Promise<void> {
    // oxlint-disable-next-line import/no-named-as-default-member -- CancelToken is accessed via the default export at runtime
    this.cancelSource = axios.CancelToken.source();
    return this.post(url, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      cancelToken: this.cancelSource.token,
      withCredentials: false,
      onUploadProgress: uploadProgressHandler,
    })
      .then((response) => response?.data)
      .catch((error) => {
        // oxlint-disable-next-line import/no-named-as-default-member -- isCancel is accessed via the default export at runtime
        if (axios.isCancel(error)) {
          console.log(error.message);
        } else {
          throw error?.response?.data;
        }
      });
  }

  cancelUpload() {
    this.cancelSource.cancel("Upload canceled");
  }
}
