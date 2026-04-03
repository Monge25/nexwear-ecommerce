const env = {
  API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL ??
    'https://api.nexwear.com/v1',

  AUTH_BASE_URL:
    import.meta.env.VITE_AUTH_BASE_URL ??
    'https://api.nexwear.com',

  API_TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT ?? 10000),

  IS_DEV: import.meta.env.DEV,
}

export default env
