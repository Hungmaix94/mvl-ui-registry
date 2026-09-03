export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  REFRESH_TOKEN_EXPIRY: 'refresh_token_expiry',
  USER_DATA: 'user_data',
  TOKEN_EXPIRY: 'token_expiry',
  THEME: 'theme',
  AUTH_FLOW_IN_PROGRESS: 'auth_flow_in_progress',
} as const

// sessionStorage, không phải localStorage: bộ nhớ URL danh sách phải chết theo tab.
// Dùng localStorage thì mở tab mới sẽ kế thừa bộ lọc của tab cũ — không ai mong đợi thế.
export const SESSION_STORAGE_KEYS = {
  LIST_URL_MEMORY: 'list_url_memory',
} as const
