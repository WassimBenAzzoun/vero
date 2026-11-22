import {
  ScrollViewStyleReset,
  useServerDocumentContext,
} from "expo-router/html";
import type { ReactNode } from "react";
export default function Root({ children }: { children: ReactNode }) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } =
    useServerDocumentContext();
  return (
    <html lang="fr" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#141A46" />
        <meta
          name="description"
          content="Vero : les expériences des clients avec les boutiques en Tunisie. Consultez et partagez vos avis."
        />
        <title>Vero — Les expériences parlent.</title>
        <ScrollViewStyleReset />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
