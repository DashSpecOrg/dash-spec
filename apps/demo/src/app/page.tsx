import { BrandLogo } from "./brand-logo";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="home-page landing-page">
      <section className="landing-section">
        <div className="page-breadcrumb" aria-label="Breadcrumb">
          <span>Home</span>
        </div>

        <div className="hero">
          <div className="hero-copy">
            <span className="hero-chip">Declarative dashboard library</span>
            <h1>Define dashboards in YAML. Render visualizations with PQL.</h1>
            <p>
              DashSpec provides a semantic YAML format for expressing dashboard
              structure, card layout, and visualization intent. Application
              teams can parse a spec once, then render a complete analytics
              experience from a clean declarative contract.
            </p>
            <div className="hero-facts">
              <span>YAML-first dashboard semantics</span>
              <span>PQL-powered visualization definitions</span>
              <span>Built for analytics application teams</span>
            </div>
          </div>

          <div className="hero-panel" aria-label="DashSpec marketing preview">
            <div className="hero-panel-grid" />
            <div className="hero-panel-card hero-panel-card-primary">
              <span className="hero-panel-label">YAML semantic</span>
              <strong>dashboard.yaml</strong>
              <span>Declarative layout, metadata, and cards in one spec.</span>
            </div>
            <div className="hero-panel-card hero-panel-card-secondary">
              <span className="hero-panel-label">Demo showcase</span>
              <strong>/demo</strong>
              <span>
                Explore a sample analytics app built on top of DashSpec.
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
