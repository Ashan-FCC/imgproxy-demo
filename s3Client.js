import { S3 } from "@aws-sdk/client-s3";

export function S3Client(endpoint, region, accessKeyId, secretAccessKey) {

  return new S3({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  })
}
