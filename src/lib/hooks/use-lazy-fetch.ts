"use client";

import { useEffect, useRef, useState } from "react";

type Result<T> = { url: string; data: T | null; error: string | null };

/**
 * `{ data, error }` 形式の API を、必要になったときだけ取得するフック。
 *
 * - active が true のときだけ取得する（タブを開いたときなど）
 * - 同じ URL で取得済み・取得中なら再取得しない（タブを行き来しても通信しない）
 * - URL が変わった後に届いた古いレスポンスは破棄する
 * - url が null のときは何もしない（条件が揃っていないとき）
 *
 * 結果は最後に取得した1件だけを保持する。URL が変わると以前の結果は表示されない。
 */
export function useLazyFetch<T>(
  url: string | null,
  active: boolean,
  errorMessage = "データの取得に失敗しました"
): { data: T | null; error: string | null; loading: boolean } {
  const [result, setResult] = useState<Result<T> | null>(null);
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  /** 最後にリクエストした URL。これと異なる URL のレスポンスは破棄する */
  const requestedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!url || !active) return;
    if (result?.url === url || loadingUrl === url) return;

    const fetchData = async () => {
      requestedUrlRef.current = url;
      setLoadingUrl(url);
      let next: Result<T>;
      try {
        const res = await fetch(url);
        const json = (await res.json()) as { data: T | null; error: string | null };
        next = json.error
          ? { url, data: null, error: json.error }
          : { url, data: json.data, error: null };
      } catch {
        next = { url, data: null, error: errorMessage };
      }
      if (requestedUrlRef.current !== url) return;
      setResult(next);
      setLoadingUrl(null);
    };

    fetchData();
  }, [url, active, result, loadingUrl, errorMessage]);

  const current = url !== null && result?.url === url ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: url !== null && loadingUrl === url,
  };
}
