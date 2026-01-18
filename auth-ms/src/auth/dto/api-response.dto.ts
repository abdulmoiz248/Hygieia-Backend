export class ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  error?: string
  statusCode: number

  constructor(statusCode: number, success: boolean, message: string, data?: T, error?: string) {
    this.statusCode = statusCode
    this.success = success
    this.message = message
    this.data = data
    this.error = error
  }
}

export const createSuccessResponse = <T>(message: string, data?: T, statusCode = 200): ApiResponse<T> => {
  return new ApiResponse(statusCode, true, message, data)
}

export const createErrorResponse = (message: string, error?: string, statusCode = 400): ApiResponse<any> => {
  return new ApiResponse(statusCode, false, message, undefined, error)
}
