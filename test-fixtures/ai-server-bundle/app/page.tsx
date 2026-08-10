import { ClientProbe } from "./client-probe";
import { serverFixtureMarkers, serverFixtureRawPrompt } from "./server-marker";

export default function Page() {
  return <main>
    <ClientProbe />
    <p>{serverFixtureMarkers}</p>
    <pre>{serverFixtureRawPrompt}</pre>
  </main>;
}
