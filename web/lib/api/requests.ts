import "whatwg-fetch";
import { v4 as uuidv4 } from 'uuid';
import { addToast } from "@heroui/react";

const SERVER_PROTOCOL = process.env.NEXT_PUBLIC_SERVER_PROTOCOL;
const SERVER_PORT = process.env.NEXT_PUBLIC_SERVER_PORT;

export function getHost(): string {
  const SERVER_IP = process.env.NEXT_PUBLIC_SERVER_IP || globalThis.location?.hostname;
  let host = SERVER_PROTOCOL + "://" + SERVER_IP;
  // 非默认值端口显式添加
  if (SERVER_PORT != "80" && SERVER_PORT != "443") {
      host = host + ":" + SERVER_PORT;
  }
  return host;
}

function getUrl(path: string): string {
  // 如果包含http则直接返回(完整路径)
  if (path.includes("http")) return path;
  return getHost() + path;
}

export function getWsUrl(path: string): string {
  // 如果包含http则直接返回(完整路径)
  if (path.includes("ws")) return path;
  return getHost().replace("https", "wss").replace("http", "ws") + path;
}

export function errorHandler(error: Error, signal: AbortSignal | null = null ) {
  // 主动取消请求
  if (signal && signal.aborted  ) {
    return;
  }
  // 错误提示
  addToast({
    title: error.message,
    variant: "flat",
    color: "danger",
  });
}

export async function responseParse(response: Response): Promise<any> {
  // if (response.status != 200) {
    // response.text().then((text) => {
    //   errorHandler(new Error(text));
    // });
    // throw new Error("Internal Server Error");
  // }

  return response.json().then((data) => {
    if (data.code && data.code != 0) {
      throw new Error(data.message);
    } else {
      return data;
    }
  });
}

export async function get(
  path: string,
  signal?: AbortSignal,
  headers: { [key: string]: string } = {"Content-Type": "application/json"}
): Promise<any> {
  const url = getUrl(path);
  headers["Request-Id"] = uuidv4();
  headers["User-Id"] = "";

  return fetch(url, {
    method: "GET",
    headers: headers,
    signal: signal,
  })
    .then((response) => {
      return responseParse(response);
    })
    .catch((error) => {
      errorHandler(error, signal);
      return Promise.reject(error.message);
    });
}

export async function post(
  path: string,
  data?: string | Record<string, any>,
  signal?: AbortSignal,
  headers: { [key: string]: string } = {"Content-Type": "application/json"}
): Promise<any> {
  const body =  typeof data === "string" ? data : JSON.stringify(data);
  const url = getUrl(path);
  headers["Request-Id"] = uuidv4();
  headers["User-Id"] = "";
  return fetch(url, {
    method: "POST",
    body,
    headers: headers,
    signal: signal,
  })
    .then((response) => {
      return responseParse(response);
    })
    .catch((error) => {
      errorHandler(error, signal);
      return Promise.reject(error.message);
    });
}



export async function filePost(
  path: string,
  body: FormData,
  signal: AbortSignal,
  headers: { [key: string]: string } = {}
): Promise<any> {
  const url = getUrl(path);
  headers["Request-Id"] = uuidv4();
  headers["User-Id"] = "";
  return fetch(url, {
    method: "POST",
    body: body,
    headers: headers,
    signal: signal,
  })
    .then((response) => {
      return responseParse(response);
    })
    .catch((error) => {
      errorHandler(error, signal);
      return Promise.reject(error.message);
    });
}

export async function put(
  path: string,
  body: string | null,
  signal: AbortSignal,
  headers: { [key: string]: string } = {"Content-Type": "application/json"}
): Promise<any> {
  const url = getUrl(path);
  headers["Request-Id"] = uuidv4();
  headers["User-Id"] = "";
  return fetch(url, {
    method: "PUT",
    body: body,
    headers: headers,
    signal: signal,
  })
    .then((response) => {
      return responseParse(response);
    })
    .catch((error) => {
      errorHandler(error, signal);
      return Promise.reject(error.message);
    });
}

export async function del(
  path: string,
  signal: AbortSignal,
  headers: { [key: string]: string } = {"Content-Type": "application/json"}
): Promise<any> {
  const url = getUrl(path);
  headers["Request-Id"] = uuidv4();
  headers["User-Id"] = "";
  return fetch(url, {
    method: "DELETE",
    headers: headers,
    signal: signal,
  })
    .then((response) => {
      return responseParse(response);
    })
    .catch((error) => {
      errorHandler(error, signal);
      return Promise.reject(error.message);
    });
}
