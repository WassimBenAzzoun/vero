import * as SecureStore from "expo-secure-store";
export const readRefresh = () => SecureStore.getItemAsync("vero.refresh");
export const writeRefresh = (value: string | null) =>
  value
    ? SecureStore.setItemAsync("vero.refresh", value)
    : SecureStore.deleteItemAsync("vero.refresh");
