import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
export type Draft = {
  query: string;
  shopId?: string;
  shopName?: string;
  pendingName: string;
  pendingLink: string;
  text: string;
  productName: string;
  rating: number;
};
const blank: Draft = {
  query: "",
  pendingName: "",
  pendingLink: "",
  text: "",
  productName: "",
  rating: 0,
};
const Context = createContext<{
  draft: Draft;
  ready: boolean;
  update: (value: Partial<Draft>) => void;
  clear: () => Promise<void>;
}>(null!);
export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(blank);
  const [ready, setReady] = useState(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    void AsyncStorage.getItem("vero.draft.v1")
      .then((value) => {
        if (value) {
          const parsed = JSON.parse(value);
          setDraft({ ...blank, ...parsed });
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  const update = (value: Partial<Draft>) =>
    setDraft((previous) => {
      const next = { ...previous, ...value };
      writes.current = writes.current
        .catch(() => {})
        .then(() =>
          AsyncStorage.setItem("vero.draft.v1", JSON.stringify(next)),
        );
      return next;
    });
  const clear = async () => {
    await writes.current.catch(() => {});
    await AsyncStorage.removeItem("vero.draft.v1");
    setDraft(blank);
  };
  return <Context value={{ draft, ready, update, clear }}>{children}</Context>;
}
export const useDraft = () => use(Context);
