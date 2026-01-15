export type MediaUploadInput = {
  workspaceId: string
  buffer: ArrayBuffer
  contentType: string
  filename?: string
}

export type MediaUploadResult = {
  path: string
  url: string
}

export interface MediaStorage {
  upload(input: MediaUploadInput): Promise<MediaUploadResult>
  getSignedUrl(path: string, expiresInSeconds?: number): Promise<string>
}
