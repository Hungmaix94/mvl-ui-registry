import { BaseApiService } from '@/api/base-service'
import { ApiPaths, type components, type paths } from '@/api/schema.ts'
import { useApiMutation } from '@/hooks/useApiQuery'

export type PresignRequestRequest = components['schemas']['PresignRequestRequest']
export type PresignResponse = components['schemas']['PresignResponse']
export type ConfirmMultipleFilesRequest = components['schemas']['ConfirmMultipleFilesRequest']
export type ConfirmMultipleFilesResponse = components['schemas']['ConfirmMultipleFilesResponse']
export type FileConfirmationRequest = components['schemas']['FileConfirmationRequest']
export type File = components['schemas']['File']

export type PresignFileParams =
  paths['/api/files/presign/']['post']['requestBody']['content']['application/json']
export type ConfirmFileParams =
  paths['/api/files/confirm/']['post']['requestBody']['content']['application/json']

/**
 * File service extending the base API service
 * Provides file upload operations (presign, confirm)
 */
export class FileService extends BaseApiService {
  /**
   * Generate presigned URL for file upload
   */
  async presignFile(fileData: PresignRequestRequest) {
    return await this.post(ApiPaths.files_presign_create, fileData)
  }

  /**
   * Confirm multiple file uploads
   */
  async confirmFiles(confirmData: ConfirmMultipleFilesRequest) {
    return await this.post(ApiPaths.files_confirm_create, confirmData)
  }

  /**
   * Confirm single file upload (convenience method)
   */
  async confirmFile(
    fileToken: string,
    purpose: string,
    relatedModel: string,
    relatedObjectId: number,
    relatedField?: string
  ): Promise<ConfirmMultipleFilesResponse> {
    const confirmData: ConfirmMultipleFilesRequest = {
      files: [
        {
          file_token: fileToken,
          purpose,
          related_model: relatedModel,
          related_object_id: relatedObjectId,
          related_field: relatedField || null,
        },
      ],
    }

    return this.confirmFiles(confirmData)
  }
}

// Create service instance via factory (lazy construction)
let _fileService: FileService | null = null

export function getFileService(): FileService {
  if (!_fileService) {
    _fileService = new FileService()
  }
  return _fileService
}

// For backward compatibility, export a getter
export const fileService = {
  get instance() {
    return getFileService()
  },
}

// React Query hooks for file operations
export function usePresignFile() {
  return useApiMutation((data: PresignRequestRequest) => getFileService().presignFile(data), {
    skipInvalidateOnSuccess: true,
  })
}

export function useConfirmFiles(options?: { skipInvalidateOnSuccess?: boolean }) {
  return useApiMutation(
    (data: ConfirmMultipleFilesRequest) => getFileService().confirmFiles(data),
    { skipInvalidateOnSuccess: options?.skipInvalidateOnSuccess }
  )
}

export function useConfirmFile() {
  return useApiMutation(
    ({
      fileToken,
      purpose,
      relatedModel,
      relatedObjectId,
      relatedField,
    }: {
      fileToken: string
      purpose: string
      relatedModel: string
      relatedObjectId: number
      relatedField?: string
    }) =>
      getFileService().confirmFile(fileToken, purpose, relatedModel, relatedObjectId, relatedField)
  )
}
