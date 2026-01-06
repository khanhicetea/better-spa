export interface S3File {
  key: string;
  metadata: {
    url: string;
  };
}

export interface S3Files {
  files: S3File[];
}
