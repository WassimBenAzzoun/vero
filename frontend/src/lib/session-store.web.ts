// Refresh credentials are exclusively in the backend's HttpOnly cookie on web.
export const readRefresh = async (): Promise<string | null> => null;
export const writeRefresh = async (_value: string | null): Promise<void> => {};
