/* eslint-disable @typescript-eslint/no-explicit-any */

export class HttpError extends Error {
  constructor(
    public response: Response,
    public body: string,
    public json: any,
  ) {
    super(`Unsuccessful HTTP Callout: ${response.status.toString()}`);
    this.name = 'HttpError';
  }

  getMessage() {
    return this.json?.error || this.body;
  }
}

const throwIfError = async (response: Response): Promise<Response> => {
  const status = response.status.toString();
  if (status.startsWith('4') || status.startsWith('5')) {
    const body = await response.text();
    let json: any;
    try {
      json = JSON.parse(body);
    } catch (e) {
      console.warn('Invalid response body json, check the network tab');
    }
    throw new HttpError(response, body, json);
  }
  return response;
};

export const post = async (url: string, data = {}) => {
  const response = await throwIfError(
    await fetch(url, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify(data),
    }),
  );
  const body = await response.text();
  return body ? JSON.parse(body) : body;
};

export const postForm = async (url: string, data = {}) =>
  throwIfError(
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(data),
    }),
  );

export const get = async (path: string, params?: Record<string, any>) => {
  const withQuery = `${path}${params ? '?' + new URLSearchParams(params) : ''}`;
  const response = await throwIfError(
    await fetch(withQuery, {
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  );

  const body = await response.text();
  return body ? JSON.parse(body) : body;
};
