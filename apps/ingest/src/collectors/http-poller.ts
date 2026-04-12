export interface HttpPollResult<T> {
  readonly status: number;
  readonly body: T;
  readonly receivedAt: string;
}

export class HttpPoller {
  async pollJson<T>(url: string): Promise<HttpPollResult<T>> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP poll failed: ${response.status} ${response.statusText}`);
    }

    return {
      status: response.status,
      body: (await response.json()) as T,
      receivedAt: new Date().toISOString()
    };
  }
}
