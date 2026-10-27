import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title: "Docs — CandleFlow",
  description: "Clone CandleFlow, run its CLI locally, and see which local REST requests return candle data.",
};

const sections = [
  ["start-here", "Clone & Run"],
  ["cli", "CLI Cases"],
  ["rest", "REST + curl"],
  ["websocket", "Live Stream"],
  ["limits", "Current Limits"],
];

const repositoryLimits = [
  {
    title: "No hosted candle API",
    detail: "The repository does not provide a public REST endpoint. Run the REST service yourself and call localhost:9003.",
  },
  {
    title: "Cloning does not start the data pipeline",
    detail: "Live data depends on configured Kafka, TimescaleDB, Redis, and running ingestion/processor services, plus Binance data availability.",
  },
  {
    title: "Historical results can be empty",
    detail: "The candles array may be empty until data is stored and the requested continuous aggregate is refreshed.",
  },
  {
    title: "Latest candle requires a cache entry",
    detail: "The latest endpoint reads Redis and returns 404 when the requested pair has no cached candle.",
  },
  {
    title: "Live WebSocket is 1-minute only",
    detail: "The current WebSocket service streams 1m updates and does not provide an initial history snapshot.",
  },
  {
    title: "CLI page is a static illustration",
    detail: "The sample terminal output is not fetched from the backend and does not represent live market data.",
  },
  {
    title: "Deployment manifests need configuration",
    detail: "Docker and Kubernetes files are provided, but they do not create a ready-to-run local stack without infrastructure and settings.",
  },
];

function CodeBlock({ children, label }: { children: string; label: string }) {
  return (
    <div className="terminal-window docs-terminal">
      <div className="terminal-titlebar docs-terminal-titlebar">
        <span className="terminal-lights" aria-hidden="true"><i /><i /><i /></span>
        <span className="docs-terminal-label">~ {label}</span>
      </div>
      <pre><code>{children}</code></pre>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="site-shell docs-shell">
      <Nav />
      <main className="docs-layout">
        <aside className="docs-sidebar">
          <span>Documentation</span>
          <nav aria-label="Documentation sections">
            {sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
          </nav>
          <a className="docs-help" href="https://github.com/SnigdhaDatta/Real-Time-Trade-Streaming-Engine/issues" target="_blank" rel="noreferrer">
            Need help?<strong>Open a GitHub issue →</strong>
          </a>
        </aside>

        <div className="docs-content">
          <header className="docs-intro">
            <span className="section-kicker">Local runbook</span>
            <h1>CandleFlow Docs</h1>
            <p>
              Clone the repository and run the commands against your own local services. There is no hosted candle API:
              REST examples below use the REST service on <code>localhost:9003</code>.
            </p>
          </header>

          <section className="docs-section" id="start-here">
            <h2>Clone &amp; Run</h2>
            <p>
              The CLI package requires Node.js 20 or newer. Install its dependencies in <code>cli/</code>; you do not
              need <code>npm link</code> to run the commands in this guide.
            </p>
            <CodeBlock label="PowerShell or terminal">{`git clone https://github.com/SnigdhaDatta/Real-Time-Trade-Streaming-Engine.git
cd Real-Time-Trade-Streaming-Engine
cd cli
npm install`}</CodeBlock>
            <p>
              Candle data only appears when the relevant backend and its dependencies are running. The repository
              does not include a one-command local stack or checked-in <code>.env.example</code> files; configure
              Kafka, TimescaleDB, and Redis for your environment before starting the services.
            </p>
            <ul>
              <li>Kafka must be reachable at <code>localhost:9092</code> by ingestion. The OHLC producer and WebSocket service use <code>KAFKA_BROKER_DEV</code> in development.</li>
              <li>TimescaleDB must have the schema from <code>shared/db/schema.sql</code> applied. The REST service and OHLC producer read <code>user</code>, <code>database</code>, and <code>password</code> environment variables.</li>
              <li>Both the REST service and OHLC producer need Redis configured with <code>REDIS_HOST</code>, <code>REDIS_PORT</code>, and <code>REDIS_PASSWORD</code>.</li>
              <li>Start the ingestion service and OHLC producer for new candles; start the REST service for HTTP requests and the WebSocket service for live streaming.</li>
            </ul>
            <p>
              Run <code>npm install</code> and then <code>npm start</code> in a separate terminal from each required
              service folder: <code>ingestion-service/</code>, <code>ohlc-producer/</code>, <code>rest-service/</code>,
              and <code>ws-service/</code>. The CLI connects directly to REST at <code>localhost:9003</code> and
              WebSocket at <code>localhost:9000</code>.
            </p>
          </section>

          <section className="docs-section" id="cli">
            <h2>CLI Cases</h2>
            <p>
              See the CLI page for the supported commands, timeframes, service options, and terminal output examples.
            </p>
            <Link className="button button-primary docs-cli-link" href="/cliplayground">
              Open CLI Playground →
            </Link>
          </section>

          <section className="docs-section" id="rest">
            <h2>REST API: Which curl Returns Data?</h2>
            <p>
              These requests target the locally running REST service. In Windows PowerShell, use <code>curl.exe</code>
              so the request is sent by curl rather than PowerShell&apos;s historical <code>curl</code> alias.
            </p>

            <h3>Check that the HTTP process responds</h3>
            <CodeBlock label="PowerShell">{`curl.exe -i "http://localhost:9003/health"`}</CodeBlock>
            <CodeBlock label="Current health response">{`HTTP/1.1 200 OK
{"message":"Service is running smoothly","status":"ok"}`}</CodeBlock>
            <p>
              This route only confirms that the REST process responds; it does not check TimescaleDB or Redis.
            </p>

            <h3>Get candle history</h3>
            <CodeBlock label="PowerShell — 15 one-minute candles">{`curl.exe -i "http://localhost:9003/candles?pair=BTCUSDT&interval=1m&limit=15"`}</CodeBlock>
            <CodeBlock label="PowerShell — 15 five-minute candles">{`curl.exe -i "http://localhost:9003/candles?pair=BTCUSDT&interval=5m&limit=15"`}</CodeBlock>
            <p>
              A successful request returns HTTP 200 with <code>pair</code>, <code>interval</code>, <code>limit</code>,
              and a <code>candles</code> array. The array may be empty if no data has been stored/aggregated yet.
              Each row contains <code>time</code>, <code>symbol</code>, <code>open</code>, <code>high</code>,
              <code>low</code>, <code>close</code>, and <code>volume</code>.
            </p>

            <h3>Get the latest cached candle</h3>
            <CodeBlock label="PowerShell">{`curl.exe -i "http://localhost:9003/candles/latest?pair=BTCUSDT"`}</CodeBlock>
            <p>
              Returns HTTP 200 and one candle object if Redis has a cached value. Before a candle has been cached,
              this endpoint returns HTTP 404 with <code>{`{"error":"Candle not found"}`}</code>.
            </p>

            <h3>Cases that do not return candle data</h3>
            <CodeBlock label="PowerShell examples">{`# Missing required pair/interval/limit
curl.exe -i "http://localhost:9003/candles"

# Invalid interval
curl.exe -i "http://localhost:9003/candles?pair=BTCUSDT&interval=2m&limit=15"

# Missing latest-candle pair
curl.exe -i "http://localhost:9003/candles/latest"`}</CodeBlock>
            <p>
              Invalid history parameters return HTTP 400 with an error object; a latest request without <code>pair</code>
              also returns HTTP 400. If the REST service cannot read Redis or TimescaleDB, it returns HTTP 500.
              If the REST process is not running, curl cannot connect.
            </p>
          </section>

          <section className="docs-section" id="websocket">
            <h2>Live WebSocket</h2>
            <p>
              The CLI connects to <code>ws://localhost:9000/?pair=BTCUSDT&interval=1m</code>. The server publishes
              candle messages as <code>{`{"pair":"BTCUSDT","candle":{...}}`}</code> from the Kafka candle topic.
              It does not send an initial history snapshot; use the REST latest/history commands for existing data.
            </p>
            <p>
              Use the WebSocket service for 1m live updates only. The current service subscribes clients by pair and
              does not filter the stream by the requested interval, so a different interval in the WebSocket query
              does not turn the stream into 5m, 15m, or 1h candles.
            </p>
          </section>

          <section className="docs-section" id="limits">
            <div className="docs-limits-heading">
              <span className="docs-limits-kicker">Read before running</span>
              <h2>What this repository does not provide by default</h2>
              <p>These are current setup and runtime boundaries—not steps that happen automatically after cloning.</p>
            </div>
            <ul className="docs-limit-list">
              {repositoryLimits.map(({ title, detail }) => (
                <li key={title}>
                  <span className="docs-limit-marker" aria-hidden="true">!</span>
                  <div>
                    <strong>{title}</strong>
                    <p>{detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
