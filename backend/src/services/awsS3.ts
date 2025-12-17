import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  S3ClientConfig,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import {
  AWS_REGION,
  AWS_S3_ACCESS_KEY_ID,
  AWS_S3_SECRET_ACCESS_KEY,
} from "../config";
import { Readable } from "stream";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type BucketName = "input" | "output" | "to-share";
export type InputPrefix = "conservation" | "landsea" | "ecosystem_service";

interface UploadInputParams {
  fileBuffer: Buffer;
  prefix: InputPrefix;
  hash: string;
  filename: string;
}

interface DownloadOuputParams {
  hash: string;
  filename: string;
}

interface ShareFileParams {
  fileBuffer: Buffer;
  filename: string;
}

const BUCKETS = {
  INPUT: "input" as BucketName,
  OUTPUT: "output" as BucketName,
  SHARE: "to-share" as BucketName,
};

export const PREFIXES: Record<string, InputPrefix> = {
  CONSERVATION: "conservation",
  LANDSEA: "landsea",
  ECOSYSTEM_SERVICE: "ecosystem_service",
};

class S3Service {
  private client: S3Client;
  constructor() {
    const config: S3ClientConfig = {
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_S3_ACCESS_KEY_ID,
        secretAccessKey: AWS_S3_SECRET_ACCESS_KEY,
      },
    };
    this.client = new S3Client(config);
  }

  async uploadFileToInput(
    params: UploadInputParams
  ): Promise<{ success: true; key: string }> {
    if (!Object.values(PREFIXES).includes(params.prefix)) {
      throw new Error(
        `Invalid prefix: ${params.prefix}. Valid prefixes are: ${Object.values(
          PREFIXES
        ).join(", ")}`
      );
    }
    const command = new PutObjectCommand({
      Bucket: BUCKETS.INPUT,
      Key: `${params.prefix}/${params.hash}/${params.filename}`,
      Body: params.fileBuffer,
      ContentType: this.getContentType(params.filename),
    });
    try {
      await this.client.send(command);
      return { success: true, key: command.input.Key! };
    } catch (error) {
      throw this.handleS3Error(error, "upload");
    }
  }

  async downloadOutputFile(params: DownloadOuputParams): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: BUCKETS.OUTPUT,
      Key: `${params.hash}/${params.filename}`,
    });

    try {
      const response = await this.client.send(command);
      return response.Body as Readable;
    } catch (error) {
      throw this.handleS3Error(error, "download");
    }
  }

  async uploadAndGetShareableUrl(params: ShareFileParams): Promise<string> {
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKETS.SHARE,
      Key: params.filename,
      Body: params.fileBuffer,
      ContentType: this.getContentType(params.filename),
    });

    try {
      await this.client.send(uploadCommand);
      return this.generatePresignedUrl(params.filename);
    } catch (error) {
      throw this.handleS3Error(error, "share upload");
    }
  }

  async deleteInputFiles(params: {
    prefix: InputPrefix;
    hash: string;
  }): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: BUCKETS.INPUT,
      Key: `${params.prefix}/${params.hash}/`,
    });

    try {
      await this.client.send(command);
    } catch (error) {
      throw this.handleS3Error(error, "delete input file");
    }
  }

  async deleteOutputFiles(params: {
    hash: string;
  }): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: BUCKETS.OUTPUT,
      Key: `${params.hash}/`,
    });

    try {
      await this.client.send(command);
    } catch (error) {
      throw this.handleS3Error(error, "delete output file");
    }
  }

  private async generatePresignedUrl(filename: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKETS.SHARE,
      Key: filename,
    });
    try {
      return await getSignedUrl(this.client, command, {
        expiresIn: 604800, // 7 days in seconds
      });
    } catch (error) {
      throw this.handleS3Error(error, "presigned URL generation");
    }
  }

  private getContentType(filename: string): string {
    const extension = filename.split(".").pop()?.toLowerCase() ?? "";
    const mimeType: Record<string, string> = {
      tif: "image/tiff",
      tiff: "image/tiff",
      geotiff: "image/tiff",
      zip: "application/zip",
      pdf: "application/pdf",
    };
    return mimeType[extension] || "application/octet-stream";
  }

  private handleS3Error(error: unknown, operation: string): Error {
    if (error instanceof Error) {
      return new Error(`S3 ${operation} failed: ${error.message}`);
    }
    return new Error(`Unknown error during S3 ${operation}`);
  }
}

export default new S3Service();
