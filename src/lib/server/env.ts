// Centralized server-only env exports.
// Keep this file in lib/server so it never ships to the client.
// Use $env/dynamic/private to avoid type coupling to local .env files.

import { env as dynamic } from '$env/dynamic/private';

/**
 * Cloudflare 平台下推薦由平台綁定提供環境變量，
 * 但為了在本地 / 類型檢查期間不報錯，這裡從 $env/dynamic/private 讀取，
 * 若不存在則回退為空字串（確保型別為 string）。
 * 請在雲端環境提供正確變量以避免請求失敗。
 */
export const ACCOUNT_ID: string = dynamic.ACCOUNT_ID ?? '';
export const SERVER_URL: string = dynamic.SERVER_URL ?? '';
export const TOKEN: string = dynamic.TOKEN ?? '';
export const S3_PUBLIC_ACCESS_ENDPOINT: string = dynamic.S3_PUBLIC_ACCESS_ENDPOINT ?? '';

