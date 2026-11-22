import { createContext, use, useEffect, useState, type ReactNode } from "react";
import {
  api,
  acceptSession,
  client,
  onSession,
  post,
  refreshSession,
  type Session,
  type User,
} from "./api";
type Config = {
  googleEnabled: boolean;
  googleWebClientId: string | null;
  recoveryEnabled: boolean;
};
type Auth = {
  user: User | null;
  ready: boolean;
  config: Config;
  reloadConfig: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<void>;
  google: (idToken: string) => Promise<void>;
};
const empty = {
  googleEnabled: false,
  googleWebClientId: null,
  recoveryEnabled: false,
};
const Context = createContext<Auth>(null!);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<Config>(empty);
  const reloadConfig = async () => setConfig(await api<Config>("/auth/config"));
  useEffect(() => {
    let mounted = true;
    onSession((value) => {
      if (mounted) setUser(value);
    });
    void Promise.allSettled([
      api<Config>("/auth/config").then((value) => {
        if (mounted) setConfig(value);
      }),
      refreshSession(),
    ]).then(() => {
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
      onSession(undefined);
    };
  }, []);
  const signIn = async (email: string, password: string) => {
    await acceptSession(
      await post<Session>("/auth/login", { email, password, client }),
    );
  };
  const register = async (
    email: string,
    password: string,
    fullName: string,
  ) => {
    await acceptSession(
      await post<Session>("/auth/register", {
        email,
        password,
        fullName,
        client,
      }),
    );
  };
  const google = async (idToken: string) => {
    await acceptSession(
      await post<Session>("/auth/google", { idToken, client }),
    );
  };
  return (
    <Context
      value={{ user, ready, config, reloadConfig, signIn, register, google }}
    >
      {children}
    </Context>
  );
}
export const useAuth = () => use(Context);
