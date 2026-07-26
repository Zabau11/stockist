export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export async function readErrorResponse(response: Response) {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: { message?: string } };
    return parsed.message ?? parsed.error?.message ?? body;
  } catch {
    return body || `${response.status} ${response.statusText}`;
  }
}
