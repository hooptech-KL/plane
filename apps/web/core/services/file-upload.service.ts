/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { AxiosProgressEvent, AxiosRequestConfig } from "axios";
import axios from "axios";
// services
import { APIService } from "@/services/api.service";

export type TMultipartUploadPart = {
  part_number: number;
  url: string;
};

export type TMultipartUploadedPart = {
  part_number: number;
  etag: string;
};

export class FileUploadService extends APIService {
  private cancelSource: any;

  constructor() {
    super("");
  }

  async uploadFile(
    url: string,
    data: FormData,
    uploadProgressHandler?: AxiosRequestConfig["onUploadProgress"]
  ): Promise<void> {
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
        if (axios.isCancel(error)) {
          console.log(error.message);
        } else {
          throw error?.response?.data;
        }
      });
  }

  /**
   * Upload a file in parts via S3 multipart presigned PUT URLs. Each part stays
   * under Cloudflare's 100MB request-body cap. Progress is aggregated across all
   * parts into a single 0-1 value forwarded to the provided handler.
   */
  async uploadMultipart(
    parts: TMultipartUploadPart[],
    file: File,
    partSize: number,
    uploadProgressHandler?: AxiosRequestConfig["onUploadProgress"]
  ): Promise<TMultipartUploadedPart[]> {
    this.cancelSource = axios.CancelToken.source();
    const totalBytes = file.size;
    const loadedPerPart: Record<number, number> = {};
    const uploadedParts: TMultipartUploadedPart[] = [];

    // eslint-disable-next-line unicorn/no-array-sort
    const orderedParts = [...parts].sort((a, b) => a.part_number - b.part_number);
    for (const part of orderedParts) {
      const start = (part.part_number - 1) * partSize;
      const end = Math.min(start + partSize, file.size);
      const blob = file.slice(start, end);

      // parts are uploaded sequentially to keep memory bounded and progress aggregation simple
      // eslint-disable-next-line no-await-in-loop
      const response = await axios.put(part.url, blob, {
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        cancelToken: this.cancelSource.token,
        withCredentials: false,
        onUploadProgress: (progressEvent) => {
          loadedPerPart[part.part_number] = progressEvent.loaded ?? 0;
          const loaded = Object.values(loadedPerPart).reduce((sum, value) => sum + value, 0);
          const aggregate: AxiosProgressEvent = {
            loaded,
            total: totalBytes,
            progress: totalBytes ? loaded / totalBytes : 0,
            bytes: progressEvent.bytes,
            estimated: progressEvent.estimated,
            rate: progressEvent.rate,
            lengthComputable: totalBytes > 0,
            upload: true,
          };
          uploadProgressHandler?.(aggregate);
        },
      });

      // ETag is required to complete the multipart upload. It is only readable
      // cross-origin when the bucket exposes it via CORS ExposeHeaders: ETag.
      const etag: string | undefined = response.headers?.etag ?? response.headers?.ETag;
      if (!etag) {
        throw new Error(
          "Missing ETag on uploaded part. Ensure the storage bucket CORS config exposes the ETag header."
        );
      }
      uploadedParts.push({ part_number: part.part_number, etag });
    }

    return uploadedParts;
  }

  cancelUpload() {
    this.cancelSource.cancel("Upload canceled");
  }
}
