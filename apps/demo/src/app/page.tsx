import { BrandLogo } from './brand-logo';

export default function HomePage() {
  return (
    <main className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-chip">Analytics app showcase</span>
          <BrandLogo className="hero-logo" />
          <h1>Declaratively define dashboards in YAML and render charts with PQL.</h1>
          <p>
            DashSpec provides a semantic YAML format for defining dashboards declaratively. Each card uses
            PQL to describe its visualization, and this demo app showcases the kind of analytics product
            you can build on top of the library.
          </p>
        </div>

        <div className="hero-panel" aria-label="DashSpec preview card">
          <div className="hero-panel-grid" />
          <div className="hero-panel-card hero-panel-card-primary">
            <span className="hero-panel-label">dashboard.yaml</span>
            <strong>name: dashboard1</strong>
            <span>semantic dashboard definition</span>
          </div>
          <div className="hero-panel-card hero-panel-card-secondary">
            <span className="hero-panel-label">PQL visualization</span>
            <strong>PLOT SCATTER(name, quantity)</strong>
            <span>analytics app rendering layer</span>
          </div>
        </div>
      </section>
    </main>
  );
}
